import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, InspectionRequest } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContext } from '../common/request-context.middleware';
import { isAlaraSideRole, isInsurerTenantRole } from '../common/app-roles';
import { CreateInspectionRequestDto } from './dto/create-inspection-request.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { DecisionDto } from './dto/decision.dto';
import { SaveReportDto } from './dto/save-report.dto';

const allowedTransitions: Record<InspectionRequest['status'], InspectionRequest['status'][]> = {
  SOLICITADA: ['AGENDADA', 'CANCELADA'],
  AGENDADA: ['REALIZADA', 'CANCELADA'],
  REALIZADA: ['APROBADA', 'RECHAZADA', 'CANCELADA'],
  CANCELADA: [],
  APROBADA: [],
  RECHAZADA: [],
};

@Injectable()
export class InspectionRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resuelve el userId del contexto a un id válido de User para FKs. Retorna undefined si no existe o está inactivo. */
  private async resolveEffectiveUserId(userId: number | undefined): Promise<number | undefined> {
    if (userId == null || userId <= 0) return undefined;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, is_active: true },
    });
    return user && user.is_active ? Number(user.id) : undefined;
  }

  async list(context: RequestContext, filters: { status?: InspectionRequest['status']; search?: string }) {
    const where: Prisma.InspectionRequestWhereInput = {};

    if (isInsurerTenantRole(context.role)) {
      if (!context.insurerId) {
        throw new BadRequestException('insurerId header requerido');
      }
      where.insurer_id = context.insurerId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { request_number: { contains: filters.search } },
        { responsible_name: { contains: filters.search } },
      ];
    }

    return this.prisma.inspectionRequest.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: { client: true, insurer: true, service_type: true },
    });
  }

  async listServiceTypes(_context: RequestContext) {
    const rows = await this.prisma.serviceType.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
      select: { id: true, name: true, sort_order: true },
    });
    return rows.map((r) => ({
      id: Number(r.id),
      name: r.name,
      sort_order: r.sort_order,
    }));
  }

  async getById(context: RequestContext, id: number) {
    const request = await this.prisma.inspectionRequest.findUnique({
      where: { id },
      include: {
        client: true,
        insurer: true,
        service_type: true,
        inspection_report: { include: { sections: { include: { fields: true } } } },
      },
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    this.ensureTenancy(context, request);
    if (isInsurerTenantRole(context.role) && !request.report_shared_at) {
      request.inspection_report = null;
    }
    const template = await this.prisma.reportTemplate.findUnique({
      where: { code: 'INSPECTION_REPORT_V1' },
    });
    return { ...request, report_template: template };
  }

  async saveReport(context: RequestContext, id: number, payload: SaveReportDto) {
    if (isInsurerTenantRole(context.role)) {
      throw new ForbiddenException('Solo ALARA puede registrar reportes');
    }

    const request = await this.prisma.inspectionRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    this.ensureTenancy(context, request);

    const effectiveUserId = await this.resolveEffectiveUserId(context.userId);

    try {
      // Muchas secciones/campos en un solo flujo superan el timeout por defecto (~5s) y Prisma
      // devuelve "Transaction not found" al seguir usando `tx` tras el cierre.
      return await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
        const report = await tx.inspectionReport.upsert({
          where: { inspection_request_id: id },
          create: {
            inspection_request_id: id,
            ...(effectiveUserId != null && { created_by_user_id: effectiveUserId }),
            summary: payload.summary ?? null,
            additional_comments: payload.additional_comments ?? null,
            outcome: payload.outcome ?? 'PENDIENTE',
          },
          update: {
            summary: payload.summary ?? null,
            additional_comments: payload.additional_comments ?? null,
            outcome: payload.outcome ?? 'PENDIENTE',
          },
        });

        await tx.reportSection.deleteMany({ where: { inspection_report_id: report.id } });
        const seenSectionCodes = new Set<string>();
        for (const section of payload.sections) {
          const code = (section.code ?? '').trim() || `section_${seenSectionCodes.size}`;
          if (seenSectionCodes.has(code)) continue;
          seenSectionCodes.add(code);

          const sectionEntity = await tx.reportSection.create({
            data: {
              inspection_report_id: report.id,
              section_code: code,
              section_title: (section.title ?? '').trim() || 'Sección',
              section_order: section.order ?? 0,
            },
          });

          if (section.fields?.length) {
            const seenKeys = new Set<string>();
            const rows = section.fields
              .filter((f) => {
                const k = (f.key ?? '').trim();
                if (!k || seenKeys.has(k)) return false;
                seenKeys.add(k);
                return true;
              })
              .map((field) => ({
                report_section_id: sectionEntity.id,
                field_key: field.key!.trim(),
                field_label: field.label ?? null,
                field_type: (field.type as any) ?? 'TEXT',
                field_value: field.value ?? null,
              }));
            if (rows.length) {
              await tx.reportField.createMany({ data: rows });
            }
          }
        }

        if (request.status !== 'REALIZADA') {
          await tx.inspectionRequest.update({
            where: { id },
            data: {
              status: 'REALIZADA',
              completed_at: new Date(),
              ...(effectiveUserId != null && { updated_by_user_id: effectiveUserId }),
            },
          });

          await tx.inspectionRequestStatusHistory.create({
            data: {
              inspection_request_id: id,
              old_status: request.status,
              new_status: 'REALIZADA',
              note: 'Reporte registrado',
              ...(effectiveUserId != null && { changed_by_user_id: effectiveUserId }),
            },
          });
        }

        return report;
        },
        { maxWait: 15_000, timeout: 120_000 },
      );
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'P2002') {
        throw new BadRequestException(
          'Código de sección o clave de campo duplicado. Revisa que no repitas section.code ni field.key dentro del mismo reporte.',
        );
      }
      throw err;
    }
  }

  async shareReport(context: RequestContext, id: number) {
    if (isInsurerTenantRole(context.role)) {
      throw new ForbiddenException('Solo ALARA puede compartir reportes');
    }

    const request = await this.prisma.inspectionRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    this.ensureTenancy(context, request);

    const effectiveUserId = await this.resolveEffectiveUserId(context.userId);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.inspectionRequest.update({
        where: { id },
        data: {
          report_shared_at: new Date(),
          ...(effectiveUserId != null && { report_shared_by_user_id: effectiveUserId }),
        },
      });

      await tx.inspectionRequestStatusHistory.create({
        data: {
          inspection_request_id: id,
          old_status: request.status,
          new_status: request.status,
          note: 'Reporte enviado a aseguradora',
          ...(effectiveUserId != null && { changed_by_user_id: effectiveUserId }),
        },
      });

      const insurerUsers = await tx.user.findMany({
        where: { insurer_id: request.insurer_id },
        select: { id: true },
      });

      if (insurerUsers.length) {
        await tx.notification.createMany({
          data: insurerUsers.map((user) => ({
            insurer_id: request.insurer_id,
            inspection_request_id: id,
            recipient_user_id: user.id,
            channel: 'IN_APP',
            subject: 'Reporte de inspección disponible',
            message: `El reporte de la solicitud ${request.request_number} fue enviado por ALARA.`,
            status: 'PENDING',
          })),
        });
      }

      return updated;
    });
  }

  async triggerInvestigation(
    context: RequestContext,
    id: number,
    sources: { name: string; url: string }[],
  ) {
    if (isInsurerTenantRole(context.role)) {
      throw new ForbiddenException('Solo ALARA puede investigar');
    }

    const request = await this.prisma.inspectionRequest.findUnique({ where: { id }, include: { client: true } });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    this.ensureTenancy(context, request);

    const effectiveUserId = await this.resolveEffectiveUserId(context.userId);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const run = await tx.workflowRun.create({
        data: {
          inspection_request_id: id,
          provider: 'N8N',
          status: 'STARTED',
          request_payload: {
            client: {
              id_number: request.client.id_number,
              id_type: request.client.id_type,
              full_name: `${request.client.first_name} ${request.client.last_name}`,
            },
            sources,
          } as any,
        },
      });

      await tx.investigation.create({
        data: {
          inspection_request_id: id,
          ...(effectiveUserId != null && { created_by_user_id: effectiveUserId }),
          source_type: 'OTHER',
          source_name: 'n8n',
          finding_summary: 'Investigación en curso.',
          risk_level: 'BAJO',
          is_adverse_record: false,
        },
      });

      return { runId: run.id, status: run.status };
    });
  }

  async startCall(context: RequestContext, id: number) {
    if (!context.userId) {
      throw new BadRequestException('userId requerido');
    }
    if (isInsurerTenantRole(context.role)) {
      throw new ForbiddenException('Solo ALARA puede iniciar llamadas');
    }

    const request = await this.prisma.inspectionRequest.findUnique({
      where: { id },
      include: { client: true },
    });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    this.ensureTenancy(context, request);

    const phone =
      request.client?.phone_mobile ??
      request.client?.phone_home ??
      request.client?.phone_work ??
      null;
    if (!phone) {
      throw new BadRequestException('El cliente no tiene teléfono para llamar');
    }

    const n8nUrl = process.env.N8N_CALL_START_URL;
    if (!n8nUrl) {
      throw new BadRequestException('N8N_CALL_START_URL no configurado');
    }

    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    let twilioFrom = process.env.TWILIO_FROM;
    const transcriptionWebhook = process.env.N8N_TRANSCRIPTION_WEBHOOK;
    const recordingWebhook = process.env.N8N_RECORDING_WEBHOOK;
    const useWhatsApp = process.env.TWILIO_USE_WHATSAPP === 'true' || process.env.TWILIO_USE_WHATSAPP === '1';

    if (!twilioAccountSid || !twilioFrom || !transcriptionWebhook) {
      throw new BadRequestException('Faltan variables de Twilio/n8n para iniciar llamada');
    }

    const normalizeE164 = (num: string) => {
      const digits = num.replace(/\D/g, '');
      return digits ? `+${digits}` : num;
    };
    let fromForTwilio = twilioFrom.trim();
    let phoneForTwilio = phone.trim();
    if (useWhatsApp) {
      fromForTwilio = `whatsapp:${normalizeE164(twilioFrom)}`;
      phoneForTwilio = `whatsapp:${normalizeE164(phone)}`;
    }

    const backendUrl = process.env.BACKEND_PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
    const twilioTwimlUrl =
      process.env.TWILIO_TWIML_URL ?? `${backendUrl}/api/webhooks/twilio/twiml/${id}`;

    const payload = {
      inspection_request_id: id,
      use_whatsapp: useWhatsApp,
      client: {
        full_name: `${request.client?.first_name ?? ''} ${request.client?.last_name ?? ''}`.trim(),
        phone: phoneForTwilio,
        id_number: request.client?.id_number ?? '',
      },
      twilio_account_sid: twilioAccountSid,
      twilio_from: fromForTwilio,
      twilio_twiml_url: twilioTwimlUrl,
      recording_webhook: recordingWebhook ?? undefined,
      transcription_webhook: transcriptionWebhook,
      backend_url: backendUrl,
    };

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new BadRequestException(`No se pudo iniciar la llamada: ${detail}`);
    }

    let result: any = null;
    try {
      result = await response.json();
    } catch (error) {
      result = null;
    }

    return { ok: true, n8n: result };
  }

  async listInvestigations(context: RequestContext, id: number) {
    const request = await this.prisma.inspectionRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    this.ensureTenancy(context, request);

    return this.prisma.investigation.findMany({
      where: { inspection_request_id: id },
      orderBy: { created_at: 'desc' },
    });
  }

  async getReportTemplate(context: RequestContext, code = 'INSPECTION_REPORT_V1') {
    if (isInsurerTenantRole(context.role) || isAlaraSideRole(context.role)) {
      const template = await this.prisma.reportTemplate.findUnique({ where: { code } });
      if (!template) {
        throw new NotFoundException('Plantilla no encontrada');
      }
      return template;
    }
    throw new ForbiddenException('Acceso no permitido');
  }

  async create(context: RequestContext, payload: CreateInspectionRequestDto) {
    if (!isInsurerTenantRole(context.role)) {
      throw new ForbiddenException('Solo aseguradoras o corredores pueden crear solicitudes');
    }
    if (!context.insurerId) {
      throw new BadRequestException('insurerId header requerido');
    }
    const insurerId = context.insurerId;
    if (!context.userId) {
      throw new BadRequestException('userId requerido');
    }
    const userId = context.userId;
    const creatingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, is_active: true },
    });
    const createdByUserId =
      creatingUser && creatingUser.is_active ? Number(creatingUser.id) : undefined;

    const existingClient = await this.prisma.client.findFirst({
      where: {
        id_type: payload.client.id_type,
        id_number: payload.client.id_number,
      },
    });

    const c = payload.client;
    const clientScalar: Prisma.ClientCreateInput = {
      first_name: c.first_name,
      last_name: c.last_name,
      dob: new Date(c.dob),
      id_type: c.id_type,
      id_number: c.id_number,
      email: c.email,
      phone_mobile: c.phone_mobile,
      phone_home: c.phone_home,
      phone_work: c.phone_work,
      employer_name: c.employer_name,
      employer_tax_id: c.employer_tax_id ?? undefined,
      profession: c.profession,
      address_line: c.address_line.trim(),
      city: c.city.trim(),
      country: c.country.trim(),
    };

    const client = existingClient
      ? await this.prisma.client.update({
          where: { id: existingClient.id },
          data: clientScalar,
        })
      : await this.prisma.client.create({ data: clientScalar });

    const insurerClient =
      (await this.prisma.insurerClient.findFirst({
        where: { insurer_id: insurerId, client_id: client.id },
      })) ??
      (await this.prisma.insurerClient.create({
        data: {
          insurer_id: insurerId,
          client_id: client.id,
          is_vip: true,
        },
      }));

    const existingByNumber = await this.prisma.inspectionRequest.findUnique({
      where: {
        insurer_id_request_number: {
          insurer_id: insurerId,
          request_number: payload.request_number.trim(),
        },
      },
    });
    if (existingByNumber) {
      throw new ConflictException(
        `Ya existe una solicitud con el número "${payload.request_number}" para esta aseguradora. Usa otro número de solicitud.`,
      );
    }

    const serviceType = await this.prisma.serviceType.findFirst({
      where: { id: BigInt(payload.service_type_id), is_active: true },
    });
    if (!serviceType) {
      throw new BadRequestException('Tipo de servicio inválido o inactivo');
    }

    try {
      const hasAmt = payload.has_amount_in_force === true;
      const amtRaw = payload.amount_in_force;
      const amountInForce =
        hasAmt && amtRaw != null && !Number.isNaN(Number(amtRaw)) ? Number(amtRaw) : null;

      const withInterview =
        payload.client_notified === true && !!payload.scheduled_start_at?.trim();
      const startAt = withInterview ? new Date(payload.scheduled_start_at!) : undefined;
      const endAt = withInterview
        ? payload.scheduled_end_at?.trim()
          ? new Date(payload.scheduled_end_at)
          : startAt
            ? new Date(startAt.getTime() + 60 * 60 * 1000)
            : undefined
        : undefined;
      const status = withInterview ? ('AGENDADA' as const) : ('SOLICITADA' as const);

      return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const created = await tx.inspectionRequest.create({
          data: {
            insurer_id: insurerId,
            insurer_client_id: insurerClient.id,
            client_id: client.id,
            service_type_id: serviceType.id,
            request_number: payload.request_number.trim(),
            agent_name: payload.agent_name,
            insured_amount: payload.insured_amount,
            has_amount_in_force: payload.has_amount_in_force,
            amount_in_force: amountInForce,
            responsible_name: payload.responsible_name,
            responsible_phone: payload.responsible_phone,
            responsible_email: payload.responsible_email,
            marital_status: payload.marital_status,
            comments: payload.comments,
            client_notified: payload.client_notified,
            interview_language: payload.interview_language,
            priority: payload.priority ?? 'NORMAL',
            status,
            scheduled_start_at: startAt,
            scheduled_end_at: endAt,
            ...(createdByUserId != null && {
              created_by_user_id: createdByUserId,
              updated_by_user_id: createdByUserId,
            }),
          },
        });

        if (status === 'AGENDADA' && createdByUserId != null) {
          await tx.inspectionRequestStatusHistory.create({
            data: {
              inspection_request_id: created.id,
              old_status: 'SOLICITADA',
              new_status: 'AGENDADA',
              note: 'Solicitud creada con entrevista agendada',
              changed_by_user_id: createdByUserId,
            },
          });
        }

        return created;
      });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'P2002') {
        throw new ConflictException(
          `Ya existe una solicitud con el número "${payload.request_number}" para esta aseguradora. Usa otro número de solicitud.`,
        );
      }
      throw err;
    }
  }

  async updateStatus(context: RequestContext, id: number, payload: UpdateStatusDto) {
    if (!context.userId) {
      throw new BadRequestException('userId requerido');
    }
    const userId = context.userId;
    const request = await this.prisma.inspectionRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    this.ensureTenancy(context, request);

    if (!allowedTransitions[request.status].includes(payload.new_status)) {
      throw new BadRequestException('Transición de estado inválida');
    }

    if (payload.new_status === 'AGENDADA' && !payload.scheduled_start_at?.trim()) {
      throw new BadRequestException('Indique la fecha y hora de la entrevista para agendar');
    }

    if (['APROBADA', 'RECHAZADA'].includes(payload.new_status)) {
      if (!isInsurerTenantRole(context.role)) {
        throw new ForbiddenException('Solo aseguradoras o corredores pueden aprobar o rechazar');
      }
    }

    if (payload.new_status === 'REALIZADA' && isInsurerTenantRole(context.role)) {
      throw new ForbiddenException('Solo ALARA puede marcar la inspección como realizada');
    }

    const scheduleStart = payload.scheduled_start_at?.trim()
      ? new Date(payload.scheduled_start_at)
      : undefined;
    const scheduleEnd =
      payload.scheduled_end_at?.trim()
        ? new Date(payload.scheduled_end_at)
        : scheduleStart && payload.new_status === 'AGENDADA'
          ? new Date(scheduleStart.getTime() + 60 * 60 * 1000)
          : undefined;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.inspectionRequest.update({
        where: { id },
        data: {
          status: payload.new_status,
          scheduled_start_at: scheduleStart ?? undefined,
          scheduled_end_at: scheduleEnd ?? undefined,
          assigned_investigator_user_id: payload.assigned_investigator_user_id,
          cancellation_reason: payload.cancellation_reason,
          updated_by_user_id: userId,
          completed_at: payload.new_status === 'REALIZADA' ? new Date() : undefined,
          closed_at: ['APROBADA', 'RECHAZADA', 'CANCELADA'].includes(payload.new_status)
            ? new Date()
            : undefined,
        },
      });

      await tx.inspectionRequestStatusHistory.create({
        data: {
          inspection_request_id: id,
          old_status: request.status,
          new_status: payload.new_status,
          note: payload.note,
          changed_by_user_id: userId,
        },
      });

      return updated;
    });
  }

  async decide(context: RequestContext, id: number, payload: DecisionDto) {
    if (!isInsurerTenantRole(context.role)) {
      throw new ForbiddenException('Solo aseguradoras o corredores pueden decidir');
    }
    if (!context.userId) {
      throw new BadRequestException('userId requerido');
    }
    const userId = context.userId;
    const request = await this.prisma.inspectionRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    this.ensureTenancy(context, request);

    if (request.status !== 'REALIZADA') {
      throw new BadRequestException('La solicitud debe estar REALIZADA para decidir');
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.inspectionRequest.update({
        where: { id },
        data: {
          status: payload.decision,
          insurer_decision: payload.decision,
          insurer_decision_reason: payload.insurer_decision_reason,
          insurer_decision_notes: payload.insurer_decision_notes,
          insurer_decided_by_user_id: userId,
          insurer_decided_at: new Date(),
          closed_at: new Date(),
          updated_by_user_id: userId,
        },
      });

      await tx.inspectionRequestStatusHistory.create({
        data: {
          inspection_request_id: id,
          old_status: request.status,
          new_status: payload.decision,
          note: payload.insurer_decision_reason ?? 'Decisión aseguradora',
          changed_by_user_id: userId,
        },
      });

      return updated;
    });
  }

  async updateClient(context: RequestContext, requestId: number, payload: UpdateClientDto) {
    const request = await this.prisma.inspectionRequest.findUnique({
      where: { id: requestId },
      include: { client: true },
    });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    this.ensureTenancy(context, request);
    if (!request.client_id) {
      throw new BadRequestException('La solicitud no tiene cliente asociado');
    }

    const data: Prisma.ClientUpdateInput = {};
    if (payload.first_name !== undefined) data.first_name = payload.first_name;
    if (payload.last_name !== undefined) data.last_name = payload.last_name;
    if (payload.dob !== undefined) data.dob = payload.dob ? new Date(payload.dob) : null;
    if (payload.id_type !== undefined) data.id_type = payload.id_type;
    if (payload.id_number !== undefined) data.id_number = payload.id_number;
    if (payload.email !== undefined) data.email = payload.email;
    if (payload.phone_mobile !== undefined) data.phone_mobile = payload.phone_mobile;
    if (payload.phone_home !== undefined) data.phone_home = payload.phone_home;
    if (payload.phone_work !== undefined) data.phone_work = payload.phone_work;
    if (payload.address_line !== undefined) data.address_line = payload.address_line;
    if (payload.city !== undefined) data.city = payload.city;
    if (payload.country !== undefined) data.country = payload.country;
    if (payload.employer_name !== undefined) data.employer_name = payload.employer_name;
    if (payload.employer_tax_id !== undefined) data.employer_tax_id = payload.employer_tax_id;
    if (payload.profession !== undefined) data.profession = payload.profession;

    await this.prisma.client.update({
      where: { id: request.client_id },
      data,
    });

    return this.getById(context, requestId);
  }

  private ensureTenancy(context: RequestContext, request: InspectionRequest) {
    if (
      isInsurerTenantRole(context.role) &&
      context.insurerId &&
      BigInt(context.insurerId) !== request.insurer_id
    ) {
      throw new ForbiddenException('Acceso restringido por aseguradora');
    }
  }
}

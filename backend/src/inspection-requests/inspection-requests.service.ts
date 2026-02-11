import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, InspectionRequest } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContext } from '../common/request-context.middleware';
import { CreateInspectionRequestDto } from './dto/create-inspection-request.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { DecisionDto } from './dto/decision.dto';
import { SaveReportDto } from './dto/save-report.dto';

const allowedTransitions: Record<InspectionRequest['status'], InspectionRequest['status'][]> = {
  SOLICITADA: ['AGENDADA', 'CANCELADA'],
  AGENDADA: ['REALIZADA', 'CANCELADA'],
  REALIZADA: ['APROBADA', 'RECHAZADA'],
  CANCELADA: [],
  APROBADA: [],
  RECHAZADA: [],
};

@Injectable()
export class InspectionRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(context: RequestContext, filters: { status?: InspectionRequest['status']; search?: string }) {
    const where: Prisma.InspectionRequestWhereInput = {};

    if (context.role === 'INSURER') {
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
      include: { client: true, insurer: true },
    });
  }

  async getById(context: RequestContext, id: number) {
    const request = await this.prisma.inspectionRequest.findUnique({
      where: { id },
      include: {
        client: true,
        insurer: true,
        inspection_report: { include: { sections: { include: { fields: true } } } },
      },
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    this.ensureTenancy(context, request);
    if (context.role === 'INSURER' && !request.report_shared_at) {
      request.inspection_report = null;
    }
    const template = await this.prisma.reportTemplate.findUnique({
      where: { code: 'INSPECTION_REPORT_V1' },
    });
    return { ...request, report_template: template };
  }

  async saveReport(context: RequestContext, id: number, payload: SaveReportDto) {
    if (!context.userId) {
      throw new BadRequestException('userId requerido');
    }
    const userId = context.userId;
    if (context.role === 'INSURER') {
      throw new ForbiddenException('Solo ALARA puede registrar reportes');
    }

    const request = await this.prisma.inspectionRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    this.ensureTenancy(context, request);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const report = await tx.inspectionReport.upsert({
        where: { inspection_request_id: id },
        create: {
          inspection_request_id: id,
          created_by_user_id: userId,
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
      for (const section of payload.sections) {
        const sectionEntity = await tx.reportSection.create({
          data: {
            inspection_report_id: report.id,
            section_code: section.code,
            section_title: section.title,
            section_order: section.order ?? 0,
          },
        });
        if (section.fields?.length) {
          await tx.reportField.createMany({
            data: section.fields.map((field) => ({
              report_section_id: sectionEntity.id,
              field_key: field.key,
              field_label: field.label ?? null,
              field_type: (field.type as any) ?? 'TEXT',
              field_value: field.value ?? null,
            })),
          });
        }
      }

      if (request.status !== 'REALIZADA') {
        await tx.inspectionRequest.update({
          where: { id },
          data: {
            status: 'REALIZADA',
            completed_at: new Date(),
            updated_by_user_id: userId,
          },
        });

        await tx.inspectionRequestStatusHistory.create({
          data: {
            inspection_request_id: id,
            old_status: request.status,
            new_status: 'REALIZADA',
            note: 'Reporte registrado',
            changed_by_user_id: userId,
          },
        });
      }

      return report;
    });
  }

  async shareReport(context: RequestContext, id: number) {
    if (!context.userId) {
      throw new BadRequestException('userId requerido');
    }
    const userId = context.userId;
    if (context.role === 'INSURER') {
      throw new ForbiddenException('Solo ALARA puede compartir reportes');
    }

    const request = await this.prisma.inspectionRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    this.ensureTenancy(context, request);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.inspectionRequest.update({
        where: { id },
        data: {
          report_shared_at: new Date(),
          report_shared_by_user_id: userId,
        },
      });

      await tx.inspectionRequestStatusHistory.create({
        data: {
          inspection_request_id: id,
          old_status: request.status,
          new_status: request.status,
          note: 'Reporte enviado a aseguradora',
          changed_by_user_id: userId,
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
    if (!context.userId) {
      throw new BadRequestException('userId requerido');
    }
    const userId = context.userId;
    if (context.role === 'INSURER') {
      throw new ForbiddenException('Solo ALARA puede investigar');
    }

    const request = await this.prisma.inspectionRequest.findUnique({ where: { id }, include: { client: true } });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    this.ensureTenancy(context, request);

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
          created_by_user_id: userId,
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
    if (context.role === 'INSURER') {
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
    if (context.role === 'INSURER' || context.role === 'ALARA') {
      const template = await this.prisma.reportTemplate.findUnique({ where: { code } });
      if (!template) {
        throw new NotFoundException('Plantilla no encontrada');
      }
      return template;
    }
    throw new ForbiddenException('Acceso no permitido');
  }

  async create(context: RequestContext, payload: CreateInspectionRequestDto) {
    if (context.role !== 'INSURER') {
      throw new ForbiddenException('Solo aseguradoras pueden crear solicitudes');
    }
    if (!context.insurerId) {
      throw new BadRequestException('insurerId header requerido');
    }
    if (!context.userId) {
      throw new BadRequestException('userId requerido');
    }
    const userId = context.userId;

    const existingClient = await this.prisma.client.findFirst({
      where: {
        id_type: payload.client.id_type ?? undefined,
        id_number: payload.client.id_number ?? undefined,
      },
    });

    const client =
      existingClient ??
      (await this.prisma.client.create({
        data: {
          ...payload.client,
          dob: payload.client.dob ? new Date(payload.client.dob) : undefined,
        },
      }));

    const insurerClient =
      (await this.prisma.insurerClient.findFirst({
        where: { insurer_id: context.insurerId, client_id: client.id },
      })) ??
      (await this.prisma.insurerClient.create({
        data: {
          insurer_id: context.insurerId,
          client_id: client.id,
          is_vip: true,
        },
      }));

    return this.prisma.inspectionRequest.create({
      data: {
        insurer_id: context.insurerId,
        insurer_client_id: insurerClient.id,
        client_id: client.id,
        request_number: payload.request_number,
        agent_name: payload.agent_name,
        insured_amount: payload.insured_amount,
        has_amount_in_force: payload.has_amount_in_force ?? false,
        responsible_name: payload.responsible_name,
        responsible_phone: payload.responsible_phone,
        responsible_email: payload.responsible_email,
        marital_status: payload.marital_status,
        comments: payload.comments,
        client_notified: payload.client_notified ?? false,
        interview_language: payload.interview_language,
        priority: payload.priority ?? 'NORMAL',
        created_by_user_id: userId,
        updated_by_user_id: userId,
      },
    });
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

    if (['APROBADA', 'RECHAZADA'].includes(payload.new_status)) {
      if (context.role !== 'INSURER') {
        throw new ForbiddenException('Solo aseguradoras pueden aprobar o rechazar');
      }
    }

    if (['AGENDADA', 'REALIZADA'].includes(payload.new_status) && context.role === 'INSURER') {
      throw new ForbiddenException('Solo ALARA puede agendar o marcar como realizada');
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.inspectionRequest.update({
        where: { id },
        data: {
          status: payload.new_status,
          scheduled_start_at: payload.scheduled_start_at
            ? new Date(payload.scheduled_start_at)
            : undefined,
          scheduled_end_at: payload.scheduled_end_at ? new Date(payload.scheduled_end_at) : undefined,
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
    if (context.role !== 'INSURER') {
      throw new ForbiddenException('Solo aseguradoras pueden decidir');
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
      context.role === 'INSURER' &&
      context.insurerId &&
      BigInt(context.insurerId) !== request.insurer_id
    ) {
      throw new ForbiddenException('Acceso restringido por aseguradora');
    }
  }
}

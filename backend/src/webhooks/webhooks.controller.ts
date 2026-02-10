import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { validateRequest } from 'twilio';
import type { Request } from 'express';

type N8nPayload = {
  runId?: string;
  status?: 'STARTED' | 'SUCCESS' | 'FAILED';
  report?: {
    outcome?: string;
    summary?: string;
    additional_comments?: string;
    sections?: {
      code: string;
      title: string;
      order?: number;
      fields?: { key: string; label?: string; type?: string; value?: string }[];
    }[];
  };
};

type TwilioRecordingPayload = {
  RecordingUrl?: string;
  RecordingSid?: string;
  CallSid?: string;
  RecordingDuration?: string;
};

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('n8n/inspection/:id')
  async handleN8n(@Param('id', ParseIntPipe) id: number, @Body() payload: N8nPayload) {
    const status = payload.status ?? 'STARTED';
    const run = await this.prisma.workflowRun.create({
      data: {
        inspection_request_id: id,
        provider: 'N8N',
        external_run_id: payload.runId,
        status,
        request_payload: payload as any,
      },
    });

    if (status === 'SUCCESS') {
      await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const request = await tx.inspectionRequest.findUnique({ where: { id } });
        if (!request) {
          return;
        }

        const report = payload.report;
        if (report) {
          const reportEntity = await tx.inspectionReport.upsert({
            where: { inspection_request_id: id },
            create: {
              inspection_request_id: id,
              created_by_user_id: request.assigned_investigator_user_id ?? request.created_by_user_id,
              summary: report.summary ?? null,
              additional_comments: report.additional_comments ?? null,
              outcome: (report.outcome as any) ?? 'PENDIENTE',
            },
            update: {
              summary: report.summary ?? null,
              additional_comments: report.additional_comments ?? null,
              outcome: (report.outcome as any) ?? 'PENDIENTE',
            },
          });

          if (report.sections?.length) {
            await tx.reportSection.deleteMany({ where: { inspection_report_id: reportEntity.id } });
            for (const section of report.sections) {
              const sectionEntity = await tx.reportSection.create({
                data: {
                  inspection_report_id: reportEntity.id,
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
          }
        }

        await tx.inspectionRequest.update({
          where: { id },
          data: {
            status: 'REALIZADA',
            completed_at: new Date(),
          },
        });

        await tx.inspectionRequestStatusHistory.create({
          data: {
            inspection_request_id: id,
            old_status: request.status,
            new_status: 'REALIZADA',
            note: 'n8n workflow completado',
            changed_by_user_id: request.assigned_investigator_user_id ?? request.created_by_user_id,
          },
        });
      });
    }

    await this.prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        response_payload: payload as any,
        finished_at: status !== 'STARTED' ? new Date() : null,
      },
    });

    return { ok: true, runId: run.id };
  }

  @Post('twilio/recording')
  async handleTwilioRecording(
    @Body() payload: TwilioRecordingPayload,
    @Query('inspection_request_id') inspectionRequestId?: string,
  ) {
    if (!payload.RecordingSid || !payload.RecordingUrl) {
      return { ok: false, message: 'RecordingSid y RecordingUrl son requeridos' };
    }

    const inspectionId = inspectionRequestId ? Number(inspectionRequestId) : undefined;
    const duration = payload.RecordingDuration ? Number(payload.RecordingDuration) : undefined;

    const created = await this.prisma.callRecording.create({
      data: {
        inspection_request_id: inspectionId && !Number.isNaN(inspectionId) ? inspectionId : undefined,
        recording_sid: payload.RecordingSid,
        call_sid: payload.CallSid ?? null,
        recording_url: payload.RecordingUrl,
        recording_duration: Number.isNaN(duration) ? undefined : duration,
      },
    });

    return { ok: true, id: created.id };
  }

  @Get('twilio/twiml/:id')
  async getTwiml(@Param('id', ParseIntPipe) id: number, @Req() req: Request, @Res() res: Response) {
    this.assertTwilioSignature(req);

    const backendUrl = process.env.BACKEND_PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
    const transcriptionWebhook = process.env.N8N_TRANSCRIPTION_WEBHOOK;
    const recordingWebhook = process.env.N8N_RECORDING_WEBHOOK;

    if (!transcriptionWebhook) {
      return res.status(500).send('N8N_TRANSCRIPTION_WEBHOOK no configurado');
    }

    const transcriptionUrl = `${transcriptionWebhook}?inspection_request_id=${encodeURIComponent(String(id))}`;
    const recordingUrl = recordingWebhook
      ? `${recordingWebhook}?inspection_request_id=${encodeURIComponent(String(id))}`
      : undefined;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="es-ES">
    Hola. Le saluda ALARA INSP, S.A. Esta llamada será grabada para fines de entrevista de inspección.
  </Say>
  <Pause length="1"/>
  <Say voice="alice" language="es-ES">
    Cuando esté listo, por favor responda las preguntas de la entrevista.
  </Say>
  <Record playBeep="true" maxLength="3600" transcribe="true" transcribeCallback="${transcriptionUrl}"${
    recordingUrl ? ` recordingStatusCallback="${recordingUrl}"` : ''
  } />
  <Say voice="alice" language="es-ES">
    Gracias. La entrevista ha finalizado.
  </Say>
</Response>`;

    res.setHeader('Content-Type', 'text/xml');
    return res.send(xml);
  }

  private assertTwilioSignature(req: Request) {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      return;
    }

    const signature = req.get('x-twilio-signature');
    if (!signature) {
      throw new UnauthorizedException('Firma de Twilio requerida');
    }

    const proto = req.get('x-forwarded-proto') ?? req.protocol;
    const host = req.get('x-forwarded-host') ?? req.get('host');
    const url = `${proto}://${host}${req.originalUrl}`;

    const isValid = validateRequest(authToken, signature, url, req.query);
    if (!isValid) {
      throw new UnauthorizedException('Firma de Twilio inválida');
    }
  }
}

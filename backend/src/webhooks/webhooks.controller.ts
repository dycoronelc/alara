import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from './pdf.service';
import { promises as fs } from 'fs';
import { join } from 'path';
import { RequestContext } from '../common/request-context.middleware';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService, private readonly pdfService: PdfService) {}

  private storageDir = join(process.cwd(), 'storage');

  async generateRequestPdf(inspectionRequestId: number, userId: number, context?: RequestContext) {
    const request = await this.prisma.inspectionRequest.findUnique({
      where: { id: inspectionRequestId },
      include: { client: true, insurer: true },
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    this.ensureTenancy(context, request.insurer_id);

    const buffer = await this.pdfService.buildRequestPdf(request);
    const filename = `solicitud_${request.request_number}.pdf`;
    const effectiveUserId = userId || Number(request.created_by_user_id);
    return this.persistPdf({
      buffer,
      filename,
      docType: 'SOLICITUD_PDF',
      insurerId: Number(request.insurer_id),
      inspectionRequestId,
      clientId: Number(request.client_id),
      userId: effectiveUserId,
    });
  }

  async generateReportPdf(inspectionRequestId: number, userId: number, context?: RequestContext) {
    const request = await this.prisma.inspectionRequest.findUnique({
      where: { id: inspectionRequestId },
      include: {
        client: true,
        insurer: true,
        inspection_report: {
          include: { sections: { include: { fields: true } } },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    this.ensureTenancy(context, request.insurer_id);

    const report = request.inspection_report
      ? {
          inspection_request_id: Number(request.id),
          outcome: request.inspection_report.outcome,
          summary: request.inspection_report.summary,
          additional_comments: request.inspection_report.additional_comments,
          sections: request.inspection_report.sections.map((section) => ({
            section_title: section.section_title,
            fields: section.fields.map((field) => ({
              field_label: field.field_label,
              field_value: field.field_value,
            })),
          })),
        }
      : null;

    const buffer = await this.pdfService.buildReportPdf(request, report);
    const filename = `reporte_${request.request_number}.pdf`;
    const effectiveUserId = userId || Number(request.created_by_user_id);
    return this.persistPdf({
      buffer,
      filename,
      docType: 'REPORTE_PDF',
      insurerId: Number(request.insurer_id),
      inspectionRequestId,
      clientId: Number(request.client_id),
      userId: effectiveUserId,
    });
  }

  private async persistPdf(params: {
    buffer: Buffer;
    filename: string;
    docType: 'SOLICITUD_PDF' | 'REPORTE_PDF';
    insurerId: number;
    inspectionRequestId: number;
    clientId: number;
    userId: number;
  }) {
    await fs.mkdir(this.storageDir, { recursive: true });
    const storageKey = `${Date.now()}_${params.filename}`;
    const filepath = join(this.storageDir, storageKey);
    await fs.writeFile(filepath, params.buffer);

    const document = await this.prisma.document.create({
      data: {
        insurer_id: params.insurerId,
        inspection_request_id: params.inspectionRequestId,
        client_id: params.clientId,
        doc_type: params.docType,
        filename: params.filename,
        mime_type: 'application/pdf',
        file_size_bytes: params.buffer.length,
        storage_provider: 'LOCAL',
        storage_key: storageKey,
        storage_url: null,
        uploaded_by_user_id: params.userId,
      },
    });

    return { buffer: params.buffer, document };
  }

  private ensureTenancy(context: RequestContext | undefined, insurerId: bigint) {
    if (
      context?.role === 'INSURER' &&
      context.insurerId &&
      BigInt(context.insurerId) !== insurerId
    ) {
      throw new NotFoundException('Documento no disponible');
    }
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from './pdf.service';
import { promises as fs } from 'fs';
import { join } from 'path';
import { RequestContext } from '../common/request-context.middleware';
import { isInsurerTenantRole } from '../common/app-roles';

const USER_UPLOAD_DOC_TYPES: DocumentType[] = ['CEDULA', 'AUTORIZACION', 'EVIDENCIA', 'OTRO'];

const UPLOAD_ALLOWED_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService, private readonly pdfService: PdfService) {}

  private storageDir = join(process.cwd(), 'storage');

  /** Solo retorna un userId si existe en User y está activo, para evitar FK en uploaded_by_user_id. */
  private async resolveEffectiveUserId(userId: number | undefined): Promise<number | undefined> {
    if (userId == null || userId <= 0) return undefined;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, is_active: true },
    });
    return user && user.is_active ? Number(user.id) : undefined;
  }

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
    const fromRequest = request.created_by_user_id != null ? Number(request.created_by_user_id) : undefined;
    const effectiveUserId = await this.resolveEffectiveUserId(
      (userId && userId > 0) ? userId : (fromRequest && fromRequest > 0 ? fromRequest : undefined),
    );
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
        service_type: true,
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
          interview_started_at: request.inspection_report.interview_started_at,
          interview_ended_at: request.inspection_report.interview_ended_at,
          sections: request.inspection_report.sections.map((section) => ({
            section_title: section.section_title,
            fields: section.fields.map((field) => ({
              field_key: field.field_key,
              field_label: field.field_label,
              field_value: field.field_value,
            })),
          })),
        }
      : null;

    const buffer = await this.pdfService.buildReportPdf(request, report);
    const filename = `reporte_${request.request_number}.pdf`;
    const fromRequest = request.created_by_user_id != null ? Number(request.created_by_user_id) : undefined;
    const effectiveUserId = await this.resolveEffectiveUserId(
      (userId && userId > 0) ? userId : (fromRequest && fromRequest > 0 ? fromRequest : undefined),
    );
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

  /**
   * Adjuntos cargados por usuarios (cédula, autorización, etc.). Solo PDF o imágenes, máx. 10 MB.
   */
  async uploadAttachment(
    inspectionRequestId: number,
    file: Express.Multer.File | undefined,
    docTypeRaw: string | undefined,
    context?: RequestContext,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Archivo requerido');
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('El archivo supera el tamaño máximo permitido (10 MB)');
    }
    if (!docTypeRaw?.trim()) {
      throw new BadRequestException('Tipo de documento requerido');
    }
    const docType = docTypeRaw.trim().toUpperCase() as DocumentType;
    if (!USER_UPLOAD_DOC_TYPES.includes(docType)) {
      throw new BadRequestException('Tipo de documento no permitido');
    }
    if (!UPLOAD_ALLOWED_MIMES.has(file.mimetype)) {
      throw new BadRequestException('Solo se permiten archivos PDF o imágenes (JPEG, PNG, WebP)');
    }

    const request = await this.prisma.inspectionRequest.findUnique({
      where: { id: inspectionRequestId },
      select: { insurer_id: true, client_id: true },
    });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    this.ensureTenancy(context, request.insurer_id);

    const effectiveUserId = await this.resolveEffectiveUserId(context?.userId);
    await fs.mkdir(this.storageDir, { recursive: true });
    const safeName = this.sanitizeFilename(file.originalname);
    const storageKey = `${Date.now()}_${safeName}`;
    const filepath = join(this.storageDir, storageKey);
    await fs.writeFile(filepath, file.buffer);

    const document = await this.prisma.document.create({
      data: {
        insurer_id: request.insurer_id,
        inspection_request_id: BigInt(inspectionRequestId),
        client_id: request.client_id,
        doc_type: docType,
        filename: safeName,
        mime_type: file.mimetype.slice(0, 80),
        file_size_bytes: BigInt(file.size),
        storage_provider: 'LOCAL',
        storage_key: storageKey,
        storage_url: null,
        ...(effectiveUserId != null && { uploaded_by_user_id: effectiveUserId }),
      },
      select: {
        id: true,
        doc_type: true,
        filename: true,
        mime_type: true,
        file_size_bytes: true,
        uploaded_at: true,
      },
    });

    return {
      ...document,
      id: Number(document.id),
      file_size_bytes: Number(document.file_size_bytes),
    };
  }

  private sanitizeFilename(name: string): string {
    const base = String(name || '')
      .replace(/^.*[/\\]/, '')
      .replace(/[^\w.\- ()áéíóúÁÉÍÓÚñÑüÜ]/g, '_')
      .trim();
    return base.slice(0, 200) || 'documento';
  }

  async listByInspectionRequest(inspectionRequestId: number, context?: RequestContext) {
    const request = await this.prisma.inspectionRequest.findUnique({
      where: { id: inspectionRequestId },
      select: { insurer_id: true },
    });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    this.ensureTenancy(context, request.insurer_id);

    return this.prisma.document.findMany({
      where: { inspection_request_id: inspectionRequestId },
      orderBy: { uploaded_at: 'desc' },
      select: {
        id: true,
        doc_type: true,
        filename: true,
        mime_type: true,
        file_size_bytes: true,
        storage_provider: true,
        uploaded_at: true,
      },
    });
  }

  /** Lee el binario del documento vinculado a la solicitud (misma regla de tenancy que el listado). */
  /** Solo ADMIN. Elimina la fila y, si aplica, el archivo en almacenamiento local. */
  async deleteDocument(
    inspectionRequestId: number,
    documentId: number,
    context?: RequestContext,
  ): Promise<void> {
    if (context?.role !== 'ADMIN') {
      throw new ForbiddenException('Solo los administradores pueden eliminar documentos');
    }

    const request = await this.prisma.inspectionRequest.findUnique({
      where: { id: inspectionRequestId },
      select: { insurer_id: true },
    });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    this.ensureTenancy(context, request.insurer_id);

    const doc = await this.prisma.document.findFirst({
      where: {
        id: BigInt(documentId),
        inspection_request_id: BigInt(inspectionRequestId),
      },
    });
    if (!doc) {
      throw new NotFoundException('Documento no encontrado');
    }

    const storageKey = doc.storage_provider === 'LOCAL' ? doc.storage_key : null;

    await this.prisma.document.delete({ where: { id: doc.id } });

    if (storageKey) {
      const filepath = join(this.storageDir, storageKey);
      try {
        await fs.unlink(filepath);
      } catch (err: unknown) {
        const code = err && typeof err === 'object' && 'code' in err ? (err as NodeJS.ErrnoException).code : '';
        if (code !== 'ENOENT') {
          /* archivo huérfano; la fila ya no existe */
        }
      }
    }
  }

  async getDocumentFile(
    inspectionRequestId: number,
    documentId: number,
    context?: RequestContext,
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    const request = await this.prisma.inspectionRequest.findUnique({
      where: { id: inspectionRequestId },
      select: { insurer_id: true },
    });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    this.ensureTenancy(context, request.insurer_id);

    const doc = await this.prisma.document.findFirst({
      where: {
        id: BigInt(documentId),
        inspection_request_id: BigInt(inspectionRequestId),
      },
    });
    if (!doc) {
      throw new NotFoundException('Documento no encontrado');
    }
    if (doc.storage_provider !== 'LOCAL' || !doc.storage_key) {
      throw new NotFoundException('Archivo no disponible');
    }
    const filepath = join(this.storageDir, doc.storage_key);
    try {
      const buffer = await fs.readFile(filepath);
      return {
        buffer,
        filename: doc.filename,
        mimeType: doc.mime_type || 'application/octet-stream',
      };
    } catch {
      throw new NotFoundException('Archivo no encontrado en almacenamiento');
    }
  }

  private async persistPdf(params: {
    buffer: Buffer;
    filename: string;
    docType: 'SOLICITUD_PDF' | 'REPORTE_PDF';
    insurerId: number;
    inspectionRequestId: number;
    clientId: number;
    userId?: number;
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
        ...(params.userId != null && params.userId > 0 && { uploaded_by_user_id: params.userId }),
      },
    });

    return { buffer: params.buffer, document };
  }

  private ensureTenancy(context: RequestContext | undefined, insurerId: bigint) {
    if (
      context &&
      isInsurerTenantRole(context.role) &&
      context.insurerId &&
      BigInt(context.insurerId) !== insurerId
    ) {
      throw new NotFoundException('Documento no disponible');
    }
  }
}

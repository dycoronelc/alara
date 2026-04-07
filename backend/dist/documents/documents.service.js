"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const pdf_service_1 = require("./pdf.service");
const fs_1 = require("fs");
const path_1 = require("path");
const app_roles_1 = require("../common/app-roles");
const USER_UPLOAD_DOC_TYPES = ['CEDULA', 'AUTORIZACION', 'EVIDENCIA', 'OTRO'];
const UPLOAD_ALLOWED_MIMES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
let DocumentsService = class DocumentsService {
    constructor(prisma, pdfService) {
        this.prisma = prisma;
        this.pdfService = pdfService;
        this.storageDir = (0, path_1.join)(process.cwd(), 'storage');
    }
    async resolveEffectiveUserId(userId) {
        if (userId == null || userId <= 0)
            return undefined;
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, is_active: true },
        });
        return user && user.is_active ? Number(user.id) : undefined;
    }
    async generateRequestPdf(inspectionRequestId, userId, context) {
        const request = await this.prisma.inspectionRequest.findUnique({
            where: { id: inspectionRequestId },
            include: { client: true, insurer: true },
        });
        if (!request) {
            throw new common_1.NotFoundException('Solicitud no encontrada');
        }
        this.ensureTenancy(context, request.insurer_id);
        const buffer = await this.pdfService.buildRequestPdf(request);
        const filename = `solicitud_${request.request_number}.pdf`;
        const fromRequest = request.created_by_user_id != null ? Number(request.created_by_user_id) : undefined;
        const effectiveUserId = await this.resolveEffectiveUserId((userId && userId > 0) ? userId : (fromRequest && fromRequest > 0 ? fromRequest : undefined));
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
    async generateReportPdf(inspectionRequestId, userId, context) {
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
            throw new common_1.NotFoundException('Solicitud no encontrada');
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
        const fromRequest = request.created_by_user_id != null ? Number(request.created_by_user_id) : undefined;
        const effectiveUserId = await this.resolveEffectiveUserId((userId && userId > 0) ? userId : (fromRequest && fromRequest > 0 ? fromRequest : undefined));
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
    async uploadAttachment(inspectionRequestId, file, docTypeRaw, context) {
        if (!file?.buffer?.length) {
            throw new common_1.BadRequestException('Archivo requerido');
        }
        if (file.size > MAX_UPLOAD_BYTES) {
            throw new common_1.BadRequestException('El archivo supera el tamaño máximo permitido (10 MB)');
        }
        if (!docTypeRaw?.trim()) {
            throw new common_1.BadRequestException('Tipo de documento requerido');
        }
        const docType = docTypeRaw.trim().toUpperCase();
        if (!USER_UPLOAD_DOC_TYPES.includes(docType)) {
            throw new common_1.BadRequestException('Tipo de documento no permitido');
        }
        if (!UPLOAD_ALLOWED_MIMES.has(file.mimetype)) {
            throw new common_1.BadRequestException('Solo se permiten archivos PDF o imágenes (JPEG, PNG, WebP)');
        }
        const request = await this.prisma.inspectionRequest.findUnique({
            where: { id: inspectionRequestId },
            select: { insurer_id: true, client_id: true },
        });
        if (!request) {
            throw new common_1.NotFoundException('Solicitud no encontrada');
        }
        this.ensureTenancy(context, request.insurer_id);
        const effectiveUserId = await this.resolveEffectiveUserId(context?.userId);
        await fs_1.promises.mkdir(this.storageDir, { recursive: true });
        const safeName = this.sanitizeFilename(file.originalname);
        const storageKey = `${Date.now()}_${safeName}`;
        const filepath = (0, path_1.join)(this.storageDir, storageKey);
        await fs_1.promises.writeFile(filepath, file.buffer);
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
    sanitizeFilename(name) {
        const base = String(name || '')
            .replace(/^.*[/\\]/, '')
            .replace(/[^\w.\- ()áéíóúÁÉÍÓÚñÑüÜ]/g, '_')
            .trim();
        return base.slice(0, 200) || 'documento';
    }
    async listByInspectionRequest(inspectionRequestId, context) {
        const request = await this.prisma.inspectionRequest.findUnique({
            where: { id: inspectionRequestId },
            select: { insurer_id: true },
        });
        if (!request) {
            throw new common_1.NotFoundException('Solicitud no encontrada');
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
    async deleteDocument(inspectionRequestId, documentId, context) {
        if (context?.role !== 'ADMIN') {
            throw new common_1.ForbiddenException('Solo los administradores pueden eliminar documentos');
        }
        const request = await this.prisma.inspectionRequest.findUnique({
            where: { id: inspectionRequestId },
            select: { insurer_id: true },
        });
        if (!request) {
            throw new common_1.NotFoundException('Solicitud no encontrada');
        }
        this.ensureTenancy(context, request.insurer_id);
        const doc = await this.prisma.document.findFirst({
            where: {
                id: BigInt(documentId),
                inspection_request_id: BigInt(inspectionRequestId),
            },
        });
        if (!doc) {
            throw new common_1.NotFoundException('Documento no encontrado');
        }
        const storageKey = doc.storage_provider === 'LOCAL' ? doc.storage_key : null;
        await this.prisma.document.delete({ where: { id: doc.id } });
        if (storageKey) {
            const filepath = (0, path_1.join)(this.storageDir, storageKey);
            try {
                await fs_1.promises.unlink(filepath);
            }
            catch (err) {
                const code = err && typeof err === 'object' && 'code' in err ? err.code : '';
                if (code !== 'ENOENT') {
                }
            }
        }
    }
    async getDocumentFile(inspectionRequestId, documentId, context) {
        const request = await this.prisma.inspectionRequest.findUnique({
            where: { id: inspectionRequestId },
            select: { insurer_id: true },
        });
        if (!request) {
            throw new common_1.NotFoundException('Solicitud no encontrada');
        }
        this.ensureTenancy(context, request.insurer_id);
        const doc = await this.prisma.document.findFirst({
            where: {
                id: BigInt(documentId),
                inspection_request_id: BigInt(inspectionRequestId),
            },
        });
        if (!doc) {
            throw new common_1.NotFoundException('Documento no encontrado');
        }
        if (doc.storage_provider !== 'LOCAL' || !doc.storage_key) {
            throw new common_1.NotFoundException('Archivo no disponible');
        }
        const filepath = (0, path_1.join)(this.storageDir, doc.storage_key);
        try {
            const buffer = await fs_1.promises.readFile(filepath);
            return {
                buffer,
                filename: doc.filename,
                mimeType: doc.mime_type || 'application/octet-stream',
            };
        }
        catch {
            throw new common_1.NotFoundException('Archivo no encontrado en almacenamiento');
        }
    }
    async persistPdf(params) {
        await fs_1.promises.mkdir(this.storageDir, { recursive: true });
        const storageKey = `${Date.now()}_${params.filename}`;
        const filepath = (0, path_1.join)(this.storageDir, storageKey);
        await fs_1.promises.writeFile(filepath, params.buffer);
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
    ensureTenancy(context, insurerId) {
        if (context &&
            (0, app_roles_1.isInsurerTenantRole)(context.role) &&
            context.insurerId &&
            BigInt(context.insurerId) !== insurerId) {
            throw new common_1.NotFoundException('Documento no disponible');
        }
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, pdf_service_1.PdfService])
], DocumentsService);
//# sourceMappingURL=documents.service.js.map
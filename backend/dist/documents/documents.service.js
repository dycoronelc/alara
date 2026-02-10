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
let DocumentsService = class DocumentsService {
    constructor(prisma, pdfService) {
        this.prisma = prisma;
        this.pdfService = pdfService;
        this.storageDir = (0, path_1.join)(process.cwd(), 'storage');
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
                uploaded_by_user_id: params.userId,
            },
        });
        return { buffer: params.buffer, document };
    }
    ensureTenancy(context, insurerId) {
        if (context?.role === 'INSURER' &&
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
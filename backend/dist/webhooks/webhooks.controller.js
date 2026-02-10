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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhooksController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let WebhooksController = class WebhooksController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async handleN8n(id, payload) {
        const status = payload.status ?? 'STARTED';
        const run = await this.prisma.workflowRun.create({
            data: {
                inspection_request_id: id,
                provider: 'N8N',
                external_run_id: payload.runId,
                status,
                request_payload: payload,
            },
        });
        if (status === 'SUCCESS') {
            await this.prisma.$transaction(async (tx) => {
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
                            outcome: report.outcome ?? 'PENDIENTE',
                        },
                        update: {
                            summary: report.summary ?? null,
                            additional_comments: report.additional_comments ?? null,
                            outcome: report.outcome ?? 'PENDIENTE',
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
                                        field_type: field.type ?? 'TEXT',
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
                response_payload: payload,
                finished_at: status !== 'STARTED' ? new Date() : null,
            },
        });
        return { ok: true, runId: run.id };
    }
};
exports.WebhooksController = WebhooksController;
__decorate([
    (0, common_1.Post)('n8n/inspection/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "handleN8n", null);
exports.WebhooksController = WebhooksController = __decorate([
    (0, common_1.Controller)('webhooks'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WebhooksController);
//# sourceMappingURL=webhooks.controller.js.map
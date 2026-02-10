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
exports.InspectionRequestsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const allowedTransitions = {
    SOLICITADA: ['AGENDADA', 'CANCELADA'],
    AGENDADA: ['REALIZADA', 'CANCELADA'],
    REALIZADA: ['APROBADA', 'RECHAZADA'],
    CANCELADA: [],
    APROBADA: [],
    RECHAZADA: [],
};
let InspectionRequestsService = class InspectionRequestsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(context, filters) {
        const where = {};
        if (context.role === 'INSURER') {
            if (!context.insurerId) {
                throw new common_1.BadRequestException('insurerId header requerido');
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
    async getById(context, id) {
        const request = await this.prisma.inspectionRequest.findUnique({
            where: { id },
            include: {
                client: true,
                insurer: true,
                inspection_report: { include: { sections: { include: { fields: true } } } },
            },
        });
        if (!request) {
            throw new common_1.NotFoundException('Solicitud no encontrada');
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
    async saveReport(context, id, payload) {
        if (!context.userId) {
            throw new common_1.BadRequestException('userId requerido');
        }
        const userId = context.userId;
        if (context.role === 'INSURER') {
            throw new common_1.ForbiddenException('Solo ALARA puede registrar reportes');
        }
        const request = await this.prisma.inspectionRequest.findUnique({ where: { id } });
        if (!request) {
            throw new common_1.NotFoundException('Solicitud no encontrada');
        }
        this.ensureTenancy(context, request);
        return this.prisma.$transaction(async (tx) => {
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
                            field_type: field.type ?? 'TEXT',
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
    async shareReport(context, id) {
        if (!context.userId) {
            throw new common_1.BadRequestException('userId requerido');
        }
        const userId = context.userId;
        if (context.role === 'INSURER') {
            throw new common_1.ForbiddenException('Solo ALARA puede compartir reportes');
        }
        const request = await this.prisma.inspectionRequest.findUnique({ where: { id } });
        if (!request) {
            throw new common_1.NotFoundException('Solicitud no encontrada');
        }
        this.ensureTenancy(context, request);
        return this.prisma.$transaction(async (tx) => {
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
    async triggerInvestigation(context, id, sources) {
        if (!context.userId) {
            throw new common_1.BadRequestException('userId requerido');
        }
        const userId = context.userId;
        if (context.role === 'INSURER') {
            throw new common_1.ForbiddenException('Solo ALARA puede investigar');
        }
        const request = await this.prisma.inspectionRequest.findUnique({ where: { id }, include: { client: true } });
        if (!request) {
            throw new common_1.NotFoundException('Solicitud no encontrada');
        }
        this.ensureTenancy(context, request);
        return this.prisma.$transaction(async (tx) => {
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
                    },
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
    async listInvestigations(context, id) {
        const request = await this.prisma.inspectionRequest.findUnique({ where: { id } });
        if (!request) {
            throw new common_1.NotFoundException('Solicitud no encontrada');
        }
        this.ensureTenancy(context, request);
        return this.prisma.investigation.findMany({
            where: { inspection_request_id: id },
            orderBy: { created_at: 'desc' },
        });
    }
    async getReportTemplate(context, code = 'INSPECTION_REPORT_V1') {
        if (context.role === 'INSURER' || context.role === 'ALARA') {
            const template = await this.prisma.reportTemplate.findUnique({ where: { code } });
            if (!template) {
                throw new common_1.NotFoundException('Plantilla no encontrada');
            }
            return template;
        }
        throw new common_1.ForbiddenException('Acceso no permitido');
    }
    async create(context, payload) {
        if (context.role !== 'INSURER') {
            throw new common_1.ForbiddenException('Solo aseguradoras pueden crear solicitudes');
        }
        if (!context.insurerId) {
            throw new common_1.BadRequestException('insurerId header requerido');
        }
        if (!context.userId) {
            throw new common_1.BadRequestException('userId requerido');
        }
        const userId = context.userId;
        const existingClient = await this.prisma.client.findFirst({
            where: {
                id_type: payload.client.id_type ?? undefined,
                id_number: payload.client.id_number ?? undefined,
            },
        });
        const client = existingClient ??
            (await this.prisma.client.create({
                data: {
                    ...payload.client,
                    dob: payload.client.dob ? new Date(payload.client.dob) : undefined,
                },
            }));
        const insurerClient = (await this.prisma.insurerClient.findFirst({
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
    async updateStatus(context, id, payload) {
        if (!context.userId) {
            throw new common_1.BadRequestException('userId requerido');
        }
        const userId = context.userId;
        const request = await this.prisma.inspectionRequest.findUnique({ where: { id } });
        if (!request) {
            throw new common_1.NotFoundException('Solicitud no encontrada');
        }
        this.ensureTenancy(context, request);
        if (!allowedTransitions[request.status].includes(payload.new_status)) {
            throw new common_1.BadRequestException('Transición de estado inválida');
        }
        if (['APROBADA', 'RECHAZADA'].includes(payload.new_status)) {
            if (context.role !== 'INSURER') {
                throw new common_1.ForbiddenException('Solo aseguradoras pueden aprobar o rechazar');
            }
        }
        if (['AGENDADA', 'REALIZADA'].includes(payload.new_status) && context.role === 'INSURER') {
            throw new common_1.ForbiddenException('Solo ALARA puede agendar o marcar como realizada');
        }
        return this.prisma.$transaction(async (tx) => {
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
    async decide(context, id, payload) {
        if (context.role !== 'INSURER') {
            throw new common_1.ForbiddenException('Solo aseguradoras pueden decidir');
        }
        if (!context.userId) {
            throw new common_1.BadRequestException('userId requerido');
        }
        const userId = context.userId;
        const request = await this.prisma.inspectionRequest.findUnique({ where: { id } });
        if (!request) {
            throw new common_1.NotFoundException('Solicitud no encontrada');
        }
        this.ensureTenancy(context, request);
        if (request.status !== 'REALIZADA') {
            throw new common_1.BadRequestException('La solicitud debe estar REALIZADA para decidir');
        }
        return this.prisma.$transaction(async (tx) => {
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
    ensureTenancy(context, request) {
        if (context.role === 'INSURER' &&
            context.insurerId &&
            BigInt(context.insurerId) !== request.insurer_id) {
            throw new common_1.ForbiddenException('Acceso restringido por aseguradora');
        }
    }
};
exports.InspectionRequestsService = InspectionRequestsService;
exports.InspectionRequestsService = InspectionRequestsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InspectionRequestsService);
//# sourceMappingURL=inspection-requests.service.js.map
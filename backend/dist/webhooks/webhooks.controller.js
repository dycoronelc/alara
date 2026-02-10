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
const twilio_1 = require("twilio");
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
    async handleTwilioRecording(payload, inspectionRequestId) {
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
    async getTwiml(id, req, res) {
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
  <Record playBeep="true" maxLength="3600" transcribe="true" transcribeCallback="${transcriptionUrl}"${recordingUrl ? ` recordingStatusCallback="${recordingUrl}"` : ''} />
  <Say voice="alice" language="es-ES">
    Gracias. La entrevista ha finalizado.
  </Say>
</Response>`;
        res.setHeader('Content-Type', 'text/xml');
        return res.send(xml);
    }
    assertTwilioSignature(req) {
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        if (!authToken) {
            return;
        }
        const signature = req.get('x-twilio-signature');
        if (!signature) {
            throw new common_1.UnauthorizedException('Firma de Twilio requerida');
        }
        const proto = req.get('x-forwarded-proto') ?? req.protocol;
        const host = req.get('x-forwarded-host') ?? req.get('host');
        const url = `${proto}://${host}${req.originalUrl}`;
        const isValid = (0, twilio_1.validateRequest)(authToken, signature, url, req.query);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Firma de Twilio inválida');
        }
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
__decorate([
    (0, common_1.Post)('twilio/recording'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('inspection_request_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "handleTwilioRecording", null);
__decorate([
    (0, common_1.Get)('twilio/twiml/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "getTwiml", null);
exports.WebhooksController = WebhooksController = __decorate([
    (0, common_1.Controller)('webhooks'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WebhooksController);
//# sourceMappingURL=webhooks.controller.js.map
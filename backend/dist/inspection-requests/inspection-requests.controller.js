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
exports.InspectionRequestsController = void 0;
const common_1 = require("@nestjs/common");
const inspection_requests_service_1 = require("./inspection-requests.service");
const create_inspection_request_dto_1 = require("./dto/create-inspection-request.dto");
const update_status_dto_1 = require("./dto/update-status.dto");
const decision_dto_1 = require("./dto/decision.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const documents_service_1 = require("../documents/documents.service");
const save_report_dto_1 = require("./dto/save-report.dto");
let InspectionRequestsController = class InspectionRequestsController {
    constructor(service, documentsService) {
        this.service = service;
        this.documentsService = documentsService;
    }
    async list(req, status, search) {
        return this.service.list(req.userContext, {
            status: status,
            search,
        });
    }
    async create(req, payload) {
        const created = await this.service.create(req.userContext, payload);
        await this.documentsService.generateRequestPdf(Number(created.id), req.userContext?.userId ?? 0, req.userContext);
        return created;
    }
    async updateStatus(req, id, payload) {
        return this.service.updateStatus(req.userContext, id, payload);
    }
    async decide(req, id, payload) {
        return this.service.decide(req.userContext, id, payload);
    }
    async saveReport(req, id, payload) {
        const report = await this.service.saveReport(req.userContext, id, payload);
        await this.documentsService.generateReportPdf(id, req.userContext?.userId ?? 0, req.userContext);
        return report;
    }
    async shareReport(req, id) {
        return this.service.shareReport(req.userContext, id);
    }
    async requestPdf(req, res, id) {
        const { buffer, document } = await this.documentsService.generateRequestPdf(id, req.userContext?.userId ?? 0, req.userContext);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
        return res.send(buffer);
    }
    async reportPdf(req, res, id) {
        if (req.userContext?.role === 'INSURER') {
            const request = await this.service.getById(req.userContext, id);
            if (!request.report_shared_at) {
                return res.status(403).json({ message: 'Reporte no compartido aún' });
            }
        }
        const { buffer, document } = await this.documentsService.generateReportPdf(id, req.userContext?.userId ?? 0, req.userContext);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
        return res.send(buffer);
    }
    async triggerInvestigation(req, id, payload) {
        return this.service.triggerInvestigation(req.userContext, id, payload.sources ?? []);
    }
    async startCall(req, id) {
        return this.service.startCall(req.userContext, id);
    }
    async listInvestigations(req, id) {
        return this.service.listInvestigations(req.userContext, id);
    }
    async reportTemplate(req) {
        return this.service.getReportTemplate(req.userContext, 'INSPECTION_REPORT_V1');
    }
    async detail(req, id) {
        return this.service.getById(req.userContext, id);
    }
};
exports.InspectionRequestsController = InspectionRequestsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], InspectionRequestsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_inspection_request_dto_1.CreateInspectionRequestDto]),
    __metadata("design:returntype", Promise)
], InspectionRequestsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/status'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, update_status_dto_1.UpdateStatusDto]),
    __metadata("design:returntype", Promise)
], InspectionRequestsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)(':id/decision'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, decision_dto_1.DecisionDto]),
    __metadata("design:returntype", Promise)
], InspectionRequestsController.prototype, "decide", null);
__decorate([
    (0, common_1.Post)(':id/report'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, save_report_dto_1.SaveReportDto]),
    __metadata("design:returntype", Promise)
], InspectionRequestsController.prototype, "saveReport", null);
__decorate([
    (0, common_1.Post)(':id/report/share'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], InspectionRequestsController.prototype, "shareReport", null);
__decorate([
    (0, common_1.Get)(':id/pdf/solicitud'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Number]),
    __metadata("design:returntype", Promise)
], InspectionRequestsController.prototype, "requestPdf", null);
__decorate([
    (0, common_1.Get)(':id/pdf/reporte'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Number]),
    __metadata("design:returntype", Promise)
], InspectionRequestsController.prototype, "reportPdf", null);
__decorate([
    (0, common_1.Post)(':id/investigate'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Object]),
    __metadata("design:returntype", Promise)
], InspectionRequestsController.prototype, "triggerInvestigation", null);
__decorate([
    (0, common_1.Post)(':id/call/start'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], InspectionRequestsController.prototype, "startCall", null);
__decorate([
    (0, common_1.Get)(':id/investigations'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], InspectionRequestsController.prototype, "listInvestigations", null);
__decorate([
    (0, common_1.Get)('report-template/default'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InspectionRequestsController.prototype, "reportTemplate", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], InspectionRequestsController.prototype, "detail", null);
exports.InspectionRequestsController = InspectionRequestsController = __decorate([
    (0, common_1.Controller)('inspection-requests'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [inspection_requests_service_1.InspectionRequestsService,
        documents_service_1.DocumentsService])
], InspectionRequestsController);
//# sourceMappingURL=inspection-requests.controller.js.map
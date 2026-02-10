"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const request_context_middleware_1 = require("./common/request-context.middleware");
const auth_module_1 = require("./auth/auth.module");
const documents_module_1 = require("./documents/documents.module");
const webhooks_module_1 = require("./webhooks/webhooks.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const health_module_1 = require("./health/health.module");
const inspection_requests_module_1 = require("./inspection-requests/inspection-requests.module");
const prisma_module_1 = require("./prisma/prisma.module");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(request_context_middleware_1.RequestContextMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            health_module_1.HealthModule,
            auth_module_1.AuthModule,
            documents_module_1.DocumentsModule,
            webhooks_module_1.WebhooksModule,
            inspection_requests_module_1.InspectionRequestsModule,
            dashboard_module_1.DashboardModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
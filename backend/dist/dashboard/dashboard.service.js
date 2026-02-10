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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let DashboardService = class DashboardService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async insurerDashboard(context) {
        if (context.role !== 'INSURER') {
            throw new common_1.BadRequestException('Solo aseguradoras');
        }
        if (!context.insurerId) {
            throw new common_1.BadRequestException('insurerId header requerido');
        }
        const requests = await this.prisma.inspectionRequest.findMany({
            where: { insurer_id: context.insurerId },
            orderBy: { created_at: 'desc' },
        });
        const statusCounts = this.countByStatus(requests);
        const monthlyTrend = this.buildMonthlyTrend(requests);
        const avgDurationDays = this.averageDuration(requests);
        return {
            total: requests.length,
            statusCounts,
            monthlyTrend,
            avgDurationDays,
        };
    }
    async alaraDashboard(context) {
        if (context.role === 'INSURER') {
            throw new common_1.BadRequestException('Solo usuarios ALARA');
        }
        const requests = await this.prisma.inspectionRequest.findMany({
            orderBy: { created_at: 'desc' },
        });
        const statusCounts = this.countByStatus(requests);
        const monthlyTrend = this.buildMonthlyTrend(requests);
        const investigatorCounts = await this.prisma.inspectionRequest.groupBy({
            by: ['assigned_investigator_user_id'],
            _count: { id: true },
            where: { assigned_investigator_user_id: { not: null } },
        });
        const investigatorIds = investigatorCounts
            .map((item) => item.assigned_investigator_user_id)
            .filter((id) => id !== null);
        const investigatorLookup = await this.prisma.user.findMany({
            where: { id: { in: investigatorIds } },
            select: { id: true, full_name: true },
        });
        const investigatorMap = new Map(investigatorLookup.map((user) => [user.id, user.full_name]));
        return {
            total: requests.length,
            statusCounts,
            monthlyTrend,
            investigators: investigatorCounts.map((item) => ({
                investigator: item.assigned_investigator_user_id
                    ? investigatorMap.get(item.assigned_investigator_user_id) ??
                        `ID ${item.assigned_investigator_user_id.toString()}`
                    : 'Sin asignar',
                total: item._count.id,
            })),
        };
    }
    countByStatus(requests) {
        const counts = new Map();
        requests.forEach((item) => counts.set(item.status, (counts.get(item.status) ?? 0) + 1));
        return Array.from(counts.entries()).map(([status, total]) => ({ status, total }));
    }
    buildMonthlyTrend(requests) {
        const trend = new Map();
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        requests.forEach((item) => {
            if (item.created_at < start) {
                return;
            }
            const key = `${item.created_at.getFullYear()}-${item.created_at.getMonth() + 1}`;
            trend.set(key, (trend.get(key) ?? 0) + 1);
        });
        return Array.from(trend.entries()).map(([month, total]) => ({ month, total }));
    }
    averageDuration(requests) {
        const durations = requests
            .filter((item) => item.closed_at)
            .map((item) => (item.closed_at.getTime() - item.requested_at.getTime()) / 86400000);
        if (!durations.length) {
            return 0;
        }
        const sum = durations.reduce((acc, value) => acc + value, 0);
        return Number((sum / durations.length).toFixed(1));
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map
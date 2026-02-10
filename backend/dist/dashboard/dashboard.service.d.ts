import { PrismaService } from '../prisma/prisma.service';
import { RequestContext } from '../common/request-context.middleware';
type StatusCount = {
    status: string;
    total: number;
};
export declare class DashboardService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    insurerDashboard(context: RequestContext): Promise<{
        total: number;
        statusCounts: StatusCount[];
        monthlyTrend: {
            month: string;
            total: number;
        }[];
        avgDurationDays: number;
    }>;
    alaraDashboard(context: RequestContext): Promise<{
        total: number;
        statusCounts: StatusCount[];
        monthlyTrend: {
            month: string;
            total: number;
        }[];
        investigators: {
            investigator: string;
            total: number;
        }[];
    }>;
    private countByStatus;
    private buildMonthlyTrend;
    private averageDuration;
}
export {};

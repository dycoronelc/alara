import { Request } from 'express';
import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly service;
    constructor(service: DashboardService);
    insurer(req: Request): Promise<{
        total: number;
        statusCounts: {
            status: string;
            total: number;
        }[];
        monthlyTrend: {
            month: string;
            total: number;
        }[];
        avgDurationDays: number;
    }>;
    alara(req: Request): Promise<{
        total: number;
        statusCounts: {
            status: string;
            total: number;
        }[];
        monthlyTrend: {
            month: string;
            total: number;
        }[];
        investigators: {
            investigator: string;
            total: number;
        }[];
    }>;
}

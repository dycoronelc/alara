import { PrismaService } from '../prisma/prisma.service';
type N8nPayload = {
    runId?: string;
    status?: 'STARTED' | 'SUCCESS' | 'FAILED';
    report?: {
        outcome?: string;
        summary?: string;
        additional_comments?: string;
        sections?: {
            code: string;
            title: string;
            order?: number;
            fields?: {
                key: string;
                label?: string;
                type?: string;
                value?: string;
            }[];
        }[];
    };
};
export declare class WebhooksController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    handleN8n(id: number, payload: N8nPayload): Promise<{
        ok: boolean;
        runId: bigint;
    }>;
}
export {};

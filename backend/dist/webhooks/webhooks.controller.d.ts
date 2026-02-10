import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import type { Request } from 'express';
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
type TwilioRecordingPayload = {
    RecordingUrl?: string;
    RecordingSid?: string;
    CallSid?: string;
    RecordingDuration?: string;
};
export declare class WebhooksController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    handleN8n(id: number, payload: N8nPayload): Promise<{
        ok: boolean;
        runId: bigint;
    }>;
    handleTwilioRecording(payload: TwilioRecordingPayload, inspectionRequestId?: string): Promise<{
        ok: boolean;
        message: string;
        id?: undefined;
    } | {
        ok: boolean;
        id: bigint;
        message?: undefined;
    }>;
    getTwiml(id: number, req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    private assertTwilioSignature;
}
export {};

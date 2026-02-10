import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from './pdf.service';
import { RequestContext } from '../common/request-context.middleware';
export declare class DocumentsService {
    private readonly prisma;
    private readonly pdfService;
    constructor(prisma: PrismaService, pdfService: PdfService);
    private storageDir;
    generateRequestPdf(inspectionRequestId: number, userId: number, context?: RequestContext): Promise<{
        buffer: Buffer<ArrayBufferLike>;
        document: {
            id: bigint;
            insurer_id: bigint;
            client_id: bigint | null;
            doc_type: import(".prisma/client").$Enums.DocumentType;
            filename: string;
            mime_type: string;
            file_size_bytes: bigint;
            storage_provider: import(".prisma/client").$Enums.StorageProvider;
            storage_key: string;
            storage_url: string | null;
            sha256: string | null;
            uploaded_at: Date;
            inspection_request_id: bigint | null;
            uploaded_by_user_id: bigint;
        };
    }>;
    generateReportPdf(inspectionRequestId: number, userId: number, context?: RequestContext): Promise<{
        buffer: Buffer<ArrayBufferLike>;
        document: {
            id: bigint;
            insurer_id: bigint;
            client_id: bigint | null;
            doc_type: import(".prisma/client").$Enums.DocumentType;
            filename: string;
            mime_type: string;
            file_size_bytes: bigint;
            storage_provider: import(".prisma/client").$Enums.StorageProvider;
            storage_key: string;
            storage_url: string | null;
            sha256: string | null;
            uploaded_at: Date;
            inspection_request_id: bigint | null;
            uploaded_by_user_id: bigint;
        };
    }>;
    private persistPdf;
    private ensureTenancy;
}

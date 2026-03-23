export declare class RequestMailService {
    private readonly logger;
    sendRequestCreatedPdf(params: {
        requestNumber: string;
        pdfFilename: string;
        pdfBuffer: Buffer;
    }): Promise<{
        sent: false;
        reason: string;
    } | {
        sent: true;
        reason?: undefined;
    }>;
}

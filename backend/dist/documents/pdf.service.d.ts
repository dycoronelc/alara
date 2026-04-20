type InspectionRequestPayload = {
    id: bigint | number;
    request_number: string;
    responsible_name: string;
    responsible_phone?: string | null;
    responsible_email?: string | null;
    agent_name?: string | null;
    insured_amount?: any;
    has_amount_in_force: boolean;
    amount_in_force?: any;
    marital_status?: string | null;
    spouse_name?: string | null;
    interview_language?: string | null;
    client_notified?: boolean | null;
    comments?: string | null;
    status: string;
    requested_at: Date;
    scheduled_start_at?: Date | null;
    scheduled_end_at?: Date | null;
    service_type?: {
        name: string;
    } | null;
    insurer: {
        name: string;
    };
    client: {
        first_name: string;
        last_name: string;
        id_type?: string | null;
        id_number?: string | null;
        dob?: Date | null;
        email?: string | null;
        phone_home?: string | null;
        phone_mobile?: string | null;
        phone_work?: string | null;
        address_line?: string | null;
        city?: string | null;
        country?: string | null;
        employer_name?: string | null;
        employer_tax_id?: string | null;
        profession?: string | null;
    };
};
type InspectionReportPayload = {
    inspection_request_id: bigint | number;
    summary?: string | null;
    additional_comments?: string | null;
    outcome: string;
    interview_started_at?: Date | null;
    interview_ended_at?: Date | null;
    sections: {
        section_title: string;
        fields: {
            field_key?: string | null;
            field_label?: string | null;
            field_value?: string | null;
        }[];
    }[];
};
export declare class PdfService {
    private brand;
    private readonly pdfLayout;
    private readonly reportColors;
    private reportPdfLayoutMode;
    private reportHeaderDrawH;
    private reportFooterDrawH;
    private reportContentTopY;
    private reportContentMargin;
    private resolveReportAsset;
    private registerReportFontsForDoc;
    private computeImageDrawHeight;
    private drawReportChrome;
    private drawReportSectionBar;
    private heightOfReportFieldCell;
    private drawReportFieldCell;
    private ensureReportPageSpace;
    private addHeader;
    private addFooter;
    private addSectionTitle;
    private addKeyValue;
    private formatReportDate;
    private formatReportDateTime;
    private isPdfFullWidthField;
    private resolveFieldValue;
    private heightOfFieldCell;
    private drawFieldCell;
    private ensurePageSpace;
    private renderTemplateSection;
    private serviceTypeShowsInformacionMedica;
    private reportTemplate;
    buildRequestPdf(request: InspectionRequestPayload): Promise<Buffer>;
    buildReportPdf(request: InspectionRequestPayload, report?: InspectionReportPayload | null): Promise<Buffer>;
}
export {};

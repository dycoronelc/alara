type InspectionRequestPayload = {
    id: bigint | number;
    request_number: string;
    responsible_name: string;
    responsible_phone?: string | null;
    responsible_email?: string | null;
    agent_name?: string | null;
    insured_amount?: any;
    has_amount_in_force: boolean;
    marital_status?: string | null;
    interview_language?: string | null;
    client_notified?: boolean | null;
    comments?: string | null;
    status: string;
    requested_at: Date;
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
    private addHeader;
    private addFooter;
    private addSectionTitle;
    private addKeyValue;
    private reportTemplate;
    buildRequestPdf(request: InspectionRequestPayload): Promise<Buffer>;
    buildReportPdf(request: InspectionRequestPayload, report?: InspectionReportPayload | null): Promise<Buffer>;
}
export {};

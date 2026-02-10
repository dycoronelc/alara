declare class ReportFieldDto {
    key: string;
    label?: string;
    type?: string;
    value?: string;
}
declare class ReportSectionDto {
    code: string;
    title: string;
    order?: number;
    fields: ReportFieldDto[];
}
export declare class SaveReportDto {
    outcome?: 'PENDIENTE' | 'FAVORABLE' | 'NO_FAVORABLE' | 'INCONCLUSO';
    summary?: string;
    additional_comments?: string;
    sections: ReportSectionDto[];
}
export {};

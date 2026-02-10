export declare class ClientInputDto {
    first_name: string;
    last_name: string;
    dob?: string;
    id_type?: 'CEDULA' | 'PASSPORT' | 'OTRO';
    id_number?: string;
    email?: string;
    phone_mobile?: string;
    phone_home?: string;
    employer_name?: string;
    employer_tax_id?: string;
    profession?: string;
}
export declare class CreateInspectionRequestDto {
    request_number: string;
    agent_name?: string;
    insured_amount?: number;
    has_amount_in_force?: boolean;
    responsible_name: string;
    responsible_phone?: string;
    responsible_email?: string;
    marital_status?: string;
    comments?: string;
    client_notified?: boolean;
    interview_language?: string;
    priority?: 'NORMAL' | 'ALTA';
    client: ClientInputDto;
}

export declare class ClientInputDto {
    first_name: string;
    last_name: string;
    dob: string;
    id_type: 'CEDULA' | 'PASSPORT' | 'OTRO';
    id_number: string;
    email: string;
    phone_mobile: string;
    phone_home: string;
    phone_work: string;
    address_line: string;
    city: string;
    country: string;
    employer_name: string;
    employer_tax_id?: string;
    profession: string;
}
export declare class CreateInspectionRequestDto {
    service_type_id: number;
    request_number: string;
    agent_name: string;
    insured_amount: number;
    has_amount_in_force: boolean;
    amount_in_force?: number;
    responsible_name: string;
    responsible_phone: string;
    responsible_email: string;
    marital_status: string;
    spouse_name?: string;
    comments?: string;
    client_notified: boolean;
    scheduled_start_at?: string;
    scheduled_end_at?: string;
    interview_language: string;
    priority?: 'NORMAL' | 'ALTA';
    client: ClientInputDto;
}

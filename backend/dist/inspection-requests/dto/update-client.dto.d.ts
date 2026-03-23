export declare class UpdateClientDto {
    first_name?: string;
    last_name?: string;
    dob?: string;
    id_type?: 'CEDULA' | 'PASSPORT' | 'OTRO';
    id_number?: string;
    email?: string;
    phone_mobile?: string;
    phone_home?: string;
    phone_work?: string;
    address_line?: string;
    city?: string;
    country?: string;
    employer_name?: string;
    employer_tax_id?: string;
    profession?: string;
}

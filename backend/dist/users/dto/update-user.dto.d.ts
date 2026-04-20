export declare class UpdateUserDto {
    email?: string;
    phone?: string;
    full_name?: string;
    password?: string;
    is_active?: boolean;
    role_code?: 'INSURER_USER' | 'ALARA_USER' | 'ADMIN' | 'BROKER_USER';
    insurer_id?: number;
    alara_office_id?: number;
}

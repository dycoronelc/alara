export declare class CreateUserDto {
    email: string;
    phone: string;
    full_name: string;
    password: string;
    role_code: 'INSURER_USER' | 'ALARA_USER' | 'ADMIN' | 'BROKER_USER';
    insurer_id?: number;
    alara_office_id?: number;
}

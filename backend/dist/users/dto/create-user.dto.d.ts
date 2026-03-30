export declare class CreateUserDto {
    email: string;
    phone: string;
    full_name: string;
    password: string;
    role_code: 'ADMIN' | 'INSURER' | 'BROKER';
    insurer_id?: number;
    alara_office_id?: number;
}

import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: number;
        email: string;
        phone: string;
        full_name: string;
        user_type: string;
        is_active: boolean;
        created_at: string;
        insurer: {
            id: number;
            name: string;
        } | null;
        alara_office: {
            id: number;
            name: string;
        } | null;
        roles: {
            code: string;
            name: string;
        }[];
    }[]>;
    findOne(id: number): Promise<{
        id: number;
        email: string;
        phone: string;
        full_name: string;
        user_type: string;
        is_active: boolean;
        created_at: string;
        insurer: {
            id: number;
            name: string;
        } | null;
        alara_office: {
            id: number;
            name: string;
        } | null;
        roles: {
            code: string;
            name: string;
        }[];
    }>;
    create(dto: CreateUserDto): Promise<{
        id: number;
        email: string;
        phone: string;
        full_name: string;
        user_type: string;
        is_active: boolean;
        created_at: string;
        insurer: {
            id: number;
            name: string;
        } | null;
        alara_office: {
            id: number;
            name: string;
        } | null;
        roles: {
            code: string;
            name: string;
        }[];
    }>;
    update(id: number, dto: UpdateUserDto): Promise<{
        id: number;
        email: string;
        phone: string;
        full_name: string;
        user_type: string;
        is_active: boolean;
        created_at: string;
        insurer: {
            id: number;
            name: string;
        } | null;
        alara_office: {
            id: number;
            name: string;
        } | null;
        roles: {
            code: string;
            name: string;
        }[];
    }>;
    private serialize;
}

import { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    private ensureAdmin;
    findAll(req: Request): Promise<{
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
    findOne(req: Request, id: number): Promise<{
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
    create(req: Request, dto: CreateUserDto): Promise<{
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
    update(req: Request, id: number, dto: UpdateUserDto): Promise<{
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
}

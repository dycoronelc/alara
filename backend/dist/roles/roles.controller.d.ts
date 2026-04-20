import { Request } from 'express';
import { RolesService } from './roles.service';
import { UpdateRoleDto } from './dto/update-role.dto';
export declare class RolesController {
    private readonly rolesService;
    constructor(rolesService: RolesService);
    private ensureAdmin;
    findAll(req: Request): import(".prisma/client").Prisma.PrismaPromise<{
        id: bigint;
        name: string;
        code: string;
    }[]>;
    update(req: Request, id: number, dto: UpdateRoleDto): Promise<{
        id: bigint;
        name: string;
        code: string;
    }>;
    remove(req: Request, id: number): Promise<void>;
}

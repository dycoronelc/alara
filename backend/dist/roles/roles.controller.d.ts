import { Request } from 'express';
import { RolesService } from './roles.service';
export declare class RolesController {
    private readonly rolesService;
    constructor(rolesService: RolesService);
    findAll(req: Request): import(".prisma/client").Prisma.PrismaPromise<{
        id: bigint;
        name: string;
        code: string;
    }[]>;
}

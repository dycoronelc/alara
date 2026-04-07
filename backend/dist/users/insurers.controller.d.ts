import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
export declare class InsurersController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(req: Request): import(".prisma/client").Prisma.PrismaPromise<{
        id: bigint;
        name: string;
    }[]>;
}

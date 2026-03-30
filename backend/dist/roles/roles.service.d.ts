import { PrismaService } from '../prisma/prisma.service';
export declare class RolesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): import(".prisma/client").Prisma.PrismaPromise<{
        id: bigint;
        name: string;
        code: string;
    }[]>;
}

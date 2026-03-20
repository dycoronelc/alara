import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly logger;
    constructor(prisma: PrismaService, jwtService: JwtService);
    login(email: string, password: string): Promise<{
        access_token: string;
        user: {
            id: number;
            full_name: string;
            email: string;
            role: string;
            insurer_id: number | undefined;
        };
    }>;
    createServiceToken(userId: number, label?: string): Promise<{
        access_token: string;
        user_id: number;
        label: string;
    }>;
    requestPasswordReset(email: string): Promise<{
        debug_reset_token?: string | undefined;
        ok: true;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        ok: true;
    }>;
}

import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ServiceTokenDto } from './dto/service-token.dto';
import { Request } from 'express';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(payload: LoginDto): Promise<{
        access_token: string;
        user: {
            id: number;
            full_name: string;
            email: string;
            role: string;
            insurer_id: number | undefined;
        };
    }>;
    forgotPassword(payload: ForgotPasswordDto): Promise<{
        debug_reset_token?: string | undefined;
        ok: true;
    }>;
    resetPassword(payload: ResetPasswordDto): Promise<{
        ok: true;
    }>;
    serviceToken(req: Request, payload: ServiceTokenDto): Promise<{
        access_token: string;
        user_id: number;
        label: string;
    }>;
}

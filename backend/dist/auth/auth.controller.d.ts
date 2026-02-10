import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
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
    serviceToken(req: Request, payload: ServiceTokenDto): Promise<{
        access_token: string;
        user_id: number;
        label: string;
    }>;
}

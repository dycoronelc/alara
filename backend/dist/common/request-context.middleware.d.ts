import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
export type UserRole = 'INSURER' | 'ALARA' | 'ADMIN';
export interface RequestContext {
    userId?: number;
    insurerId?: number;
    role: UserRole;
}
declare module 'express-serve-static-core' {
    interface Request {
        userContext?: RequestContext;
    }
}
export declare class RequestContextMiddleware implements NestMiddleware {
    use(req: Request, _res: Response, next: NextFunction): void;
}

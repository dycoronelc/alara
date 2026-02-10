import { Injectable, NestMiddleware } from '@nestjs/common';
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

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    if (req.user && typeof req.user === 'object') {
      const user = req.user as RequestContext & { userId?: number };
      req.userContext = {
        role: user.role ?? 'ALARA',
        userId: user.userId,
        insurerId: user.insurerId,
      };
      return next();
    }

    const roleHeader = String(req.header('x-user-role') ?? 'ALARA');
    const role = (['INSURER', 'ALARA', 'ADMIN'] as const).includes(
      roleHeader as UserRole,
    )
      ? (roleHeader as UserRole)
      : 'ALARA';

    const userId = Number(req.header('x-user-id') ?? 0) || undefined;
    const insurerId = Number(req.header('x-insurer-id') ?? 0) || undefined;

    req.userContext = { role, userId, insurerId };
    next();
  }
}

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import type { RequestContext } from './request-context.middleware';
import type { JwtRole } from './app-roles';

/** Passport adjunta `user` después del JwtAuthGuard; el middleware corre antes y solo ve headers. */
@Injectable()
export class UserContextFromJwtInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const u = req.user as { userId?: number; role?: JwtRole; insurerId?: number } | undefined;
    if (u && typeof u.userId === 'number' && u.role) {
      req.userContext = {
        userId: u.userId,
        role: u.role,
        insurerId: u.insurerId,
      } as RequestContext;
    }
    return next.handle();
  }
}

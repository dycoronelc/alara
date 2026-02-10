import { CallHandler, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
export declare class BigIntInterceptor implements NestInterceptor {
    intercept(_context: unknown, next: CallHandler): Observable<unknown>;
}

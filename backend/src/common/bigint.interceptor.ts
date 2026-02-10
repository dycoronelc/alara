import { CallHandler, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

const convertBigInt = (value: unknown, seen = new WeakSet<object>()): unknown => {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    value &&
    typeof value === 'object' &&
    'd' in value &&
    'e' in value &&
    's' in value &&
    typeof (value as { toString?: () => string }).toString === 'function'
  ) {
    return (value as { toString: () => string }).toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => convertBigInt(item, seen));
  }

  if (value && typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]';
    }
    seen.add(value);
    const entries = Object.entries(value).map(([key, val]) => [key, convertBigInt(val, seen)]);
    return Object.fromEntries(entries);
  }

  return value;
};

@Injectable()
export class BigIntInterceptor implements NestInterceptor {
  intercept(_context: unknown, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => convertBigInt(data)));
  }
}

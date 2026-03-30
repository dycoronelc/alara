import { Strategy } from 'passport-jwt';
import type { JwtRole } from '../common/app-roles';
export type JwtPayload = {
    sub: number;
    role: JwtRole;
    insurerId?: number;
};
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    constructor();
    validate(payload: JwtPayload): Promise<{
        userId: number;
        role: JwtRole;
        insurerId: number | undefined;
    }>;
}
export {};

import { Strategy } from 'passport-jwt';
export type JwtPayload = {
    sub: number;
    role: 'INSURER' | 'ALARA' | 'ADMIN';
    insurerId?: number;
};
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    constructor();
    validate(payload: JwtPayload): Promise<{
        userId: number;
        role: "INSURER" | "ALARA" | "ADMIN";
        insurerId: number | undefined;
    }>;
}
export {};

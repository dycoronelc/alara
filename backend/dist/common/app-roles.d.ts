export type JwtRole = 'INSURER' | 'ALARA' | 'ADMIN' | 'BROKER';
export declare function isInsurerTenantRole(role: string): boolean;
export declare function isAlaraSideRole(role: string): boolean;

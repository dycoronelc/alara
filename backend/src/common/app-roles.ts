/** Rol emitido en JWT y usado en RequestContext */
export type JwtRole = 'INSURER' | 'ALARA' | 'ADMIN' | 'BROKER';

export function isInsurerTenantRole(role: string): boolean {
  return role === 'INSURER' || role === 'BROKER';
}

export function isAlaraSideRole(role: string): boolean {
  return role === 'ALARA' || role === 'ADMIN';
}

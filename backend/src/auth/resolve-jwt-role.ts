import { BadRequestException } from '@nestjs/common';
import type { User, UserType } from '@prisma/client';
import type { JwtRole } from '../common/app-roles';

type UserWithRoles = User & { roles: { role: { code: string } }[] };

/**
 * Prioridad: tablas `user_roles` + `roles`, luego `user.user_type` (mismo código que `roles.code`).
 * JWT usa roles cortos para el API (INSURER / ALARA / ADMIN / BROKER).
 */
export function resolveJwtRole(user: UserWithRoles): JwtRole {
  const codes = user.roles.map((r) => r.role.code);
  if (codes.includes('ADMIN')) return 'ADMIN';
  if (codes.includes('BROKER_USER') || codes.includes('BROKER')) return 'BROKER';
  if (codes.includes('INSURER_USER') || codes.includes('INSURER')) return 'INSURER';
  if (codes.includes('ALARA_USER')) return 'ALARA';

  switch (user.user_type) {
    case 'ADMIN':
      return 'ADMIN';
    case 'BROKER_USER':
    case 'BROKER':
      return 'BROKER';
    case 'INSURER_USER':
    case 'INSURER':
      return 'INSURER';
    case 'ALARA_USER':
    case 'ALARA':
    default:
      return 'ALARA';
  }
}

/** Valida que el código exista en catálogo `roles` y devuelve el `UserType` equivalente (mismo literal). */
export function userTypeFromRoleCode(roleCode: string): UserType {
  const allowed: UserType[] = ['INSURER_USER', 'ALARA_USER', 'ADMIN', 'BROKER_USER'];
  if (allowed.includes(roleCode as UserType)) {
    return roleCode as UserType;
  }
  throw new BadRequestException(`Código de rol no válido para user_type: ${roleCode}`);
}

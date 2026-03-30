import type { User, UserType } from '@prisma/client';
import type { JwtRole } from '../common/app-roles';

type UserWithRoles = User & { roles: { role: { code: string } }[] };

export function resolveJwtRole(user: UserWithRoles): JwtRole {
  const codes = user.roles.map((r) => r.role.code);
  if (codes.includes('ADMIN')) return 'ADMIN';
  if (codes.includes('INSURER')) return 'INSURER';
  if (codes.includes('BROKER')) return 'BROKER';
  if (user.user_type === 'INSURER') return 'INSURER';
  if (user.user_type === 'BROKER') return 'BROKER';
  return 'ALARA';
}

export function userTypeForNewRole(roleCode: string): UserType {
  if (roleCode === 'ADMIN') return 'ALARA';
  if (roleCode === 'INSURER') return 'INSURER';
  if (roleCode === 'BROKER') return 'BROKER';
  return 'ALARA';
}

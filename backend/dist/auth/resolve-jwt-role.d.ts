import type { User, UserType } from '@prisma/client';
import type { JwtRole } from '../common/app-roles';
type UserWithRoles = User & {
    roles: {
        role: {
            code: string;
        };
    }[];
};
export declare function resolveJwtRole(user: UserWithRoles): JwtRole;
export declare function userTypeFromRoleCode(roleCode: string): UserType;
export {};

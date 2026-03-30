"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveJwtRole = resolveJwtRole;
exports.userTypeFromRoleCode = userTypeFromRoleCode;
const common_1 = require("@nestjs/common");
function resolveJwtRole(user) {
    const codes = user.roles.map((r) => r.role.code);
    if (codes.includes('ADMIN'))
        return 'ADMIN';
    if (codes.includes('BROKER_USER'))
        return 'BROKER';
    if (codes.includes('INSURER_USER'))
        return 'INSURER';
    if (codes.includes('ALARA_USER'))
        return 'ALARA';
    switch (user.user_type) {
        case 'ADMIN':
            return 'ADMIN';
        case 'BROKER_USER':
            return 'BROKER';
        case 'INSURER_USER':
            return 'INSURER';
        case 'ALARA_USER':
        default:
            return 'ALARA';
    }
}
function userTypeFromRoleCode(roleCode) {
    const allowed = ['INSURER_USER', 'ALARA_USER', 'ADMIN', 'BROKER_USER'];
    if (allowed.includes(roleCode)) {
        return roleCode;
    }
    throw new common_1.BadRequestException(`Código de rol no válido para user_type: ${roleCode}`);
}
//# sourceMappingURL=resolve-jwt-role.js.map
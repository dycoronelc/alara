"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveJwtRole = resolveJwtRole;
exports.userTypeForNewRole = userTypeForNewRole;
function resolveJwtRole(user) {
    const codes = user.roles.map((r) => r.role.code);
    if (codes.includes('ADMIN'))
        return 'ADMIN';
    if (codes.includes('INSURER'))
        return 'INSURER';
    if (codes.includes('BROKER'))
        return 'BROKER';
    if (user.user_type === 'INSURER')
        return 'INSURER';
    if (user.user_type === 'BROKER')
        return 'BROKER';
    return 'ALARA';
}
function userTypeForNewRole(roleCode) {
    if (roleCode === 'ADMIN')
        return 'ALARA';
    if (roleCode === 'INSURER')
        return 'INSURER';
    if (roleCode === 'BROKER')
        return 'BROKER';
    return 'ALARA';
}
//# sourceMappingURL=resolve-jwt-role.js.map
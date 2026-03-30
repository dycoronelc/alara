"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInsurerTenantRole = isInsurerTenantRole;
exports.isAlaraSideRole = isAlaraSideRole;
function isInsurerTenantRole(role) {
    return role === 'INSURER' || role === 'BROKER';
}
function isAlaraSideRole(role) {
    return role === 'ALARA' || role === 'ADMIN';
}
//# sourceMappingURL=app-roles.js.map
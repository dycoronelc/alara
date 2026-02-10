"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestContextMiddleware = void 0;
const common_1 = require("@nestjs/common");
let RequestContextMiddleware = class RequestContextMiddleware {
    use(req, _res, next) {
        if (req.user && typeof req.user === 'object') {
            const user = req.user;
            req.userContext = {
                role: user.role ?? 'ALARA',
                userId: user.userId,
                insurerId: user.insurerId,
            };
            return next();
        }
        const roleHeader = String(req.header('x-user-role') ?? 'ALARA');
        const role = ['INSURER', 'ALARA', 'ADMIN'].includes(roleHeader)
            ? roleHeader
            : 'ALARA';
        const userId = Number(req.header('x-user-id') ?? 0) || undefined;
        const insurerId = Number(req.header('x-insurer-id') ?? 0) || undefined;
        req.userContext = { role, userId, insurerId };
        next();
    }
};
exports.RequestContextMiddleware = RequestContextMiddleware;
exports.RequestContextMiddleware = RequestContextMiddleware = __decorate([
    (0, common_1.Injectable)()
], RequestContextMiddleware);
//# sourceMappingURL=request-context.middleware.js.map
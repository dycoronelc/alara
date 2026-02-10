"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = require("bcryptjs");
const jsonwebtoken_1 = require("jsonwebtoken");
let AuthService = class AuthService {
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async login(email, password) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || !user.is_active) {
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        const matches = await bcrypt.compare(password, user.password_hash);
        if (!matches) {
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        const payload = {
            sub: Number(user.id),
            role: user.user_type === 'INSURER' ? 'INSURER' : 'ALARA',
            insurerId: user.insurer_id ? Number(user.insurer_id) : undefined,
        };
        return {
            access_token: await this.jwtService.signAsync(payload),
            user: {
                id: Number(user.id),
                full_name: user.full_name,
                email: user.email,
                role: payload.role,
                insurer_id: payload.insurerId,
            },
        };
    }
    async createServiceToken(userId, label) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.is_active) {
            throw new common_1.UnauthorizedException('Usuario inválido');
        }
        const payload = {
            sub: Number(user.id),
            role: user.user_type === 'INSURER' ? 'INSURER' : 'ALARA',
            insurerId: user.insurer_id ? Number(user.insurer_id) : undefined,
            service: true,
            label: label ?? 'n8n',
        };
        const secret = process.env.JWT_SECRET || 'alara-insp-dev-secret';
        const token = (0, jsonwebtoken_1.sign)(payload, secret);
        return { access_token: token, user_id: Number(user.id), label: payload.label };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map
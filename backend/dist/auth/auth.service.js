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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = require("bcryptjs");
const crypto_1 = require("crypto");
const jsonwebtoken_1 = require("jsonwebtoken");
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async login(email, password) {
        const trimmed = email.trim();
        const user = await this.prisma.user.findUnique({ where: { email: trimmed } });
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
    async requestPasswordReset(email) {
        const trimmed = email.trim();
        const user = await this.prisma.user.findUnique({ where: { email: trimmed } });
        if (!user || !user.is_active) {
            return { ok: true };
        }
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                password_reset_token: token,
                password_reset_expires_at: expires,
            },
        });
        this.logger.log(`Solicitud de restablecimiento de contraseña para ${trimmed}`);
        const isDev = process.env.NODE_ENV !== 'production';
        if (isDev) {
            this.logger.warn(`[DEV] Token de restablecimiento (no usar en producción expuesto): ${token}`);
        }
        return {
            ok: true,
            ...(isDev ? { debug_reset_token: token } : {}),
        };
    }
    async resetPassword(token, newPassword) {
        const trimmed = token.trim();
        if (!trimmed) {
            throw new common_1.BadRequestException('Token requerido');
        }
        const user = await this.prisma.user.findFirst({
            where: {
                password_reset_token: trimmed,
                password_reset_expires_at: { gt: new Date() },
            },
        });
        if (!user) {
            throw new common_1.BadRequestException('El enlace no es válido o ha expirado. Solicita uno nuevo.');
        }
        const password_hash = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                password_hash,
                password_reset_token: null,
                password_reset_expires_at: null,
            },
        });
        return { ok: true };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map
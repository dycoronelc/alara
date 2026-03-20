import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { sign } from 'jsonwebtoken';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService, private readonly jwtService: JwtService) {}

  async login(email: string, password: string) {
    const trimmed = email.trim();
    const user = await this.prisma.user.findUnique({ where: { email: trimmed } });
    if (!user || !user.is_active) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      throw new UnauthorizedException('Credenciales inválidas');
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

  async createServiceToken(userId: number, label?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.is_active) {
      throw new UnauthorizedException('Usuario inválido');
    }

    const payload = {
      sub: Number(user.id),
      role: user.user_type === 'INSURER' ? 'INSURER' : 'ALARA',
      insurerId: user.insurer_id ? Number(user.insurer_id) : undefined,
      service: true,
      label: label ?? 'n8n',
    };

    const secret = process.env.JWT_SECRET || 'alara-insp-dev-secret';
    const token = sign(payload, secret);

    return { access_token: token, user_id: Number(user.id), label: payload.label };
  }

  /**
   * Siempre responde igual si el correo existe o no (evita enumeración).
   * En desarrollo se puede devolver `debug_reset_token` para probar sin correo.
   */
  async requestPasswordReset(email: string) {
    const trimmed = email.trim();
    const user = await this.prisma.user.findUnique({ where: { email: trimmed } });

    if (!user || !user.is_active) {
      return { ok: true as const };
    }

    const token = randomBytes(32).toString('hex');
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
      ok: true as const,
      ...(isDev ? { debug_reset_token: token } : {}),
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const trimmed = token.trim();
    if (!trimmed) {
      throw new BadRequestException('Token requerido');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        password_reset_token: trimmed,
        password_reset_expires_at: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('El enlace no es válido o ha expirado. Solicita uno nuevo.');
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

    return { ok: true as const };
  }
}

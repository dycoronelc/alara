import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { sign } from 'jsonwebtoken';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwtService: JwtService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
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
}

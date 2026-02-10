import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export type JwtPayload = {
  sub: number;
  role: 'INSURER' | 'ALARA' | 'ADMIN';
  insurerId?: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'alara-insp-dev-secret',
    });
  }

  async validate(payload: JwtPayload) {
    return {
      userId: payload.sub,
      role: payload.role,
      insurerId: payload.insurerId,
    };
  }
}

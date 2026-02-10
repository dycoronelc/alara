import { Body, Controller, Post, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ServiceTokenDto } from './dto/service-token.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() payload: LoginDto) {
    return this.authService.login(payload.email, payload.password);
  }

  @Post('service-token')
  @UseGuards(JwtAuthGuard)
  async serviceToken(@Req() req: Request, @Body() payload: ServiceTokenDto) {
    if (req.userContext?.role !== 'ALARA' && req.userContext?.role !== 'ADMIN') {
      throw new ForbiddenException('Solo ALARA/ADMIN puede generar tokens de servicio');
    }
    return this.authService.createServiceToken(payload.user_id, payload.label);
  }
}

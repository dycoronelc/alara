import { Body, Controller, Post, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
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

  @Post('forgot-password')
  async forgotPassword(@Body() payload: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(payload.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() payload: ResetPasswordDto) {
    return this.authService.resetPassword(payload.token, payload.new_password);
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

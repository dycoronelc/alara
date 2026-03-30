import { Controller, Get, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesService } from './roles.service';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  findAll(@Req() req: Request) {
    if (req.userContext?.role !== 'ADMIN') {
      throw new ForbiddenException('Solo administradores');
    }
    return this.rolesService.findAll();
  }
}

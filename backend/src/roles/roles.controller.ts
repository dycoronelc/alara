import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesService } from './roles.service';
import { UpdateRoleDto } from './dto/update-role.dto';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  private ensureAdmin(req: Request) {
    if (req.userContext?.role !== 'ADMIN') {
      throw new ForbiddenException('Solo administradores');
    }
  }

  @Get()
  findAll(@Req() req: Request) {
    this.ensureAdmin(req);
    return this.rolesService.findAll();
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) {
    this.ensureAdmin(req);
    return this.rolesService.update(id, dto.name);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    this.ensureAdmin(req);
    return this.rolesService.remove(id);
  }
}

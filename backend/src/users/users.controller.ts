import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private ensureAdmin(req: Request) {
    if (req.userContext?.role !== 'ADMIN') {
      throw new ForbiddenException('Solo administradores');
    }
  }

  @Get()
  findAll(@Req() req: Request) {
    this.ensureAdmin(req);
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    this.ensureAdmin(req);
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateUserDto) {
    this.ensureAdmin(req);
    return this.usersService.create(dto);
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    this.ensureAdmin(req);
    return this.usersService.update(id, dto);
  }

  /** Baja lógica: desactiva el usuario (no borra el registro). */
  @Delete(':id')
  remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    this.ensureAdmin(req);
    if (req.userContext?.userId === id) {
      throw new ForbiddenException('No puede desactivar su propio usuario');
    }
    return this.usersService.softDelete(id);
  }
}

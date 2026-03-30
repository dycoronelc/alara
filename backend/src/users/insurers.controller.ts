import { Controller, Get, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

/** Listado de aseguradoras para formularios de administración (alta de usuarios). */
@Controller('insurers')
@UseGuards(JwtAuthGuard)
export class InsurersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Req() req: Request) {
    if (req.userContext?.role !== 'ADMIN') {
      throw new ForbiddenException('Solo administradores');
    }
    return this.prisma.insurer.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
}

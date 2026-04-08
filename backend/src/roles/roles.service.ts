import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true },
    });
  }

  async update(id: number, name: string) {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Rol no encontrado');
    }
    return this.prisma.role.update({
      where: { id },
      data: { name: name.trim() },
      select: { id: true, code: true, name: true },
    });
  }

  async remove(id: number) {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Rol no encontrado');
    }
    const n = await this.prisma.userRole.count({ where: { role_id: id } });
    if (n > 0) {
      throw new ConflictException('No se puede eliminar: hay usuarios asignados a este rol');
    }
    await this.prisma.role.delete({ where: { id } });
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { userTypeForNewRole } from '../auth/resolve-jwt-role';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        insurer: { select: { id: true, name: true } },
        alara_office: { select: { id: true, name: true } },
        roles: { include: { role: { select: { code: true, name: true } } } },
      },
    });
    return users.map((u) => this.serialize(u));
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        insurer: { select: { id: true, name: true } },
        alara_office: { select: { id: true, name: true } },
        roles: { include: { role: { select: { code: true, name: true } } } },
      },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.serialize(user);
  }

  async create(dto: CreateUserDto) {
    const role = await this.prisma.role.findUnique({ where: { code: dto.role_code } });
    if (!role) {
      throw new BadRequestException('Rol inválido');
    }

    const user_type = userTypeForNewRole(dto.role_code);

    let insurer_id: bigint | null = dto.insurer_id != null ? BigInt(dto.insurer_id) : null;
    let alara_office_id: bigint | null =
      dto.alara_office_id != null ? BigInt(dto.alara_office_id) : null;

    if (dto.role_code === 'INSURER' || dto.role_code === 'BROKER') {
      if (!insurer_id) {
        throw new BadRequestException('La aseguradora es obligatoria para este rol');
      }
    }

    if ((dto.role_code === 'ADMIN' || user_type === 'ALARA') && !alara_office_id) {
      const first = await this.prisma.alaraOffice.findFirst({ orderBy: { id: 'asc' } });
      if (first) {
        alara_office_id = first.id;
      }
    }

    if (user_type === 'ALARA' && !alara_office_id) {
      throw new BadRequestException('Defina una oficina ALARA o cree una en el sistema');
    }

    const password_hash = await bcrypt.hash(dto.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email.trim().toLowerCase(),
          phone: dto.phone.trim(),
          full_name: dto.full_name.trim(),
          password_hash,
          user_type,
          insurer_id: user_type === 'INSURER' || user_type === 'BROKER' ? insurer_id : null,
          alara_office_id: user_type === 'ALARA' ? alara_office_id : null,
          roles: {
            create: {
              role: { connect: { id: role.id } },
            },
          },
        },
        include: {
          insurer: { select: { id: true, name: true } },
          alara_office: { select: { id: true, name: true } },
          roles: { include: { role: { select: { code: true, name: true } } } },
        },
      });
      return this.serialize(user);
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === 'P2002') {
        throw new ConflictException('Ya existe un usuario con ese correo');
      }
      throw e;
    }
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id);

    const data: {
      email?: string;
      phone?: string;
      full_name?: string;
      is_active?: boolean;
      password_hash?: string;
    } = {};
    if (dto.email !== undefined) data.email = dto.email.trim().toLowerCase();
    if (dto.phone !== undefined) data.phone = dto.phone.trim();
    if (dto.full_name !== undefined) data.full_name = dto.full_name.trim();
    if (dto.is_active !== undefined) data.is_active = dto.is_active;
    if (dto.password) {
      data.password_hash = await bcrypt.hash(dto.password, 10);
    }

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data,
        include: {
          insurer: { select: { id: true, name: true } },
          alara_office: { select: { id: true, name: true } },
          roles: { include: { role: { select: { code: true, name: true } } } },
        },
      });
      return this.serialize(user);
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === 'P2002') {
        throw new ConflictException('Ya existe un usuario con ese correo');
      }
      throw e;
    }
  }

  private serialize(
    user: {
      id: bigint;
      email: string;
      phone: string | null;
      full_name: string;
      user_type: string;
      is_active: boolean;
      created_at: Date;
      insurer: { id: bigint; name: string } | null;
      alara_office: { id: bigint; name: string } | null;
      roles: { role: { code: string; name: string } }[];
    },
  ) {
    return {
      id: Number(user.id),
      email: user.email,
      phone: user.phone ?? '',
      full_name: user.full_name,
      user_type: user.user_type,
      is_active: user.is_active,
      created_at: user.created_at.toISOString(),
      insurer: user.insurer ? { id: Number(user.insurer.id), name: user.insurer.name } : null,
      alara_office: user.alara_office
        ? { id: Number(user.alara_office.id), name: user.alara_office.name }
        : null,
      roles: user.roles.map((r) => ({ code: r.role.code, name: r.role.name })),
    };
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { UserType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { userTypeFromRoleCode } from '../auth/resolve-jwt-role';

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

    const user_type = userTypeFromRoleCode(dto.role_code);

    let insurer_id: bigint | null = dto.insurer_id != null ? BigInt(dto.insurer_id) : null;
    let alara_office_id: bigint | null =
      dto.alara_office_id != null ? BigInt(dto.alara_office_id) : null;

    if (dto.role_code === 'INSURER_USER' || dto.role_code === 'BROKER_USER') {
      if (!insurer_id) {
        throw new BadRequestException('La aseguradora es obligatoria para este rol');
      }
    }

    if ((dto.role_code === 'ADMIN' || dto.role_code === 'ALARA_USER') && !alara_office_id) {
      const first = await this.prisma.alaraOffice.findFirst({ orderBy: { id: 'asc' } });
      if (first) {
        alara_office_id = first.id;
      }
    }

    if ((user_type === 'ALARA_USER' || user_type === 'ADMIN') && !alara_office_id) {
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
          insurer_id: user_type === 'INSURER_USER' || user_type === 'BROKER_USER' ? insurer_id : null,
          alara_office_id: user_type === 'ALARA_USER' || user_type === 'ADMIN' ? alara_office_id : null,
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
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
      include: {
        insurer: { select: { id: true, name: true } },
        alara_office: { select: { id: true, name: true } },
        roles: { include: { role: { select: { code: true, name: true } } } },
      },
    });
    if (!existingUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const baseData: {
      email?: string;
      phone?: string;
      full_name?: string;
      is_active?: boolean;
      password_hash?: string;
      user_type?: UserType;
      insurer_id?: bigint | null;
      alara_office_id?: bigint | null;
    } = {};

    if (dto.email !== undefined) baseData.email = dto.email.trim().toLowerCase();
    if (dto.phone !== undefined) baseData.phone = dto.phone.trim();
    if (dto.full_name !== undefined) baseData.full_name = dto.full_name.trim();
    if (dto.is_active !== undefined) baseData.is_active = dto.is_active;
    if (dto.password) {
      baseData.password_hash = await bcrypt.hash(dto.password, 10);
    }

    const primaryRoleCode = existingUser.roles[0]?.role?.code ?? String(existingUser.user_type);
    const roleChanged = dto.role_code !== undefined && dto.role_code !== primaryRoleCode;

    if (roleChanged) {
      const role = await this.prisma.role.findUnique({ where: { code: dto.role_code } });
      if (!role) {
        throw new BadRequestException('Rol inválido');
      }
      const user_type = userTypeFromRoleCode(dto.role_code!);

      let insurer_id: bigint | null = existingUser.insurer_id;
      let alara_office_id: bigint | null = existingUser.alara_office_id;

      if (dto.role_code === 'INSURER_USER' || dto.role_code === 'BROKER_USER') {
        const nid =
          dto.insurer_id != null ? BigInt(dto.insurer_id) : existingUser.insurer_id;
        if (!nid) {
          throw new BadRequestException('La aseguradora es obligatoria para este rol');
        }
        insurer_id = nid;
        alara_office_id = null;
      } else {
        insurer_id = null;
        if (dto.role_code === 'ADMIN' || dto.role_code === 'ALARA_USER') {
          if (dto.alara_office_id != null) {
            alara_office_id = BigInt(dto.alara_office_id);
          } else if (!alara_office_id) {
            const first = await this.prisma.alaraOffice.findFirst({ orderBy: { id: 'asc' } });
            if (first) {
              alara_office_id = first.id;
            }
          }
          if (!alara_office_id) {
            throw new BadRequestException('Defina una oficina ALARA o cree una en el sistema');
          }
        } else {
          alara_office_id = null;
        }
      }

      baseData.user_type = user_type;
      baseData.insurer_id = insurer_id;
      baseData.alara_office_id = alara_office_id;

      try {
        const user = await this.prisma.$transaction(async (tx) => {
          await tx.userRole.deleteMany({ where: { user_id: id } });
          await tx.userRole.create({
            data: {
              user_id: id,
              role_id: role.id,
            },
          });
          return tx.user.update({
            where: { id },
            data: baseData,
            include: {
              insurer: { select: { id: true, name: true } },
              alara_office: { select: { id: true, name: true } },
              roles: { include: { role: { select: { code: true, name: true } } } },
            },
          });
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

    if (dto.insurer_id !== undefined) {
      const ut = existingUser.user_type;
      if (ut === 'INSURER_USER' || ut === 'BROKER_USER') {
        baseData.insurer_id = BigInt(dto.insurer_id);
      }
    }
    if (dto.alara_office_id !== undefined) {
      const ut = existingUser.user_type;
      if (ut === 'ALARA_USER' || ut === 'ADMIN') {
        baseData.alara_office_id = BigInt(dto.alara_office_id);
      }
    }

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: baseData,
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

  async softDelete(id: number) {
    await this.findOne(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { is_active: false },
      include: {
        insurer: { select: { id: true, name: true } },
        alara_office: { select: { id: true, name: true } },
        roles: { include: { role: { select: { code: true, name: true } } } },
      },
    });
    return this.serialize(user);
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

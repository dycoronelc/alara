import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: 'degraded',
        service: 'alara-insp-api',
        database: 'unreachable',
        hint: 'Revisa DATABASE_URL en Railway y que MySQL acepte conexiones.',
      });
    }
    return { status: 'ok', service: 'alara-insp-api', database: 'ok' };
  }
}

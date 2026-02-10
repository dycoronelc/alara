import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const {
      DATABASE_URL,
      DB_HOST,
      DB_USER,
      DB_PASSWORD,
      DB_NAME,
      DB_PORT = '3306',
    } = process.env;

    const url =
      DATABASE_URL ??
      (DB_HOST && DB_USER && DB_NAME
        ? `mysql://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD ?? '')}` +
          `@${DB_HOST}:${DB_PORT}/${DB_NAME}`
        : undefined);

    super(
      url
        ? {
            datasources: {
              db: { url },
            },
          }
        : undefined,
    );
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

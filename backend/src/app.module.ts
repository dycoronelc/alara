import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RequestContextMiddleware } from './common/request-context.middleware';
import { UserContextFromJwtInterceptor } from './common/user-context-from-jwt.interceptor';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { InspectionRequestsModule } from './inspection-requests/inspection-requests.module';
import { PrismaModule } from './prisma/prisma.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AuthModule,
    DocumentsModule,
    WebhooksModule,
    InspectionRequestsModule,
    DashboardModule,
    RolesModule,
    UsersModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: UserContextFromJwtInterceptor }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}

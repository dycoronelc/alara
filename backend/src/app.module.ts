import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RequestContextMiddleware } from './common/request-context.middleware';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { InspectionRequestsModule } from './inspection-requests/inspection-requests.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AuthModule,
    DocumentsModule,
    WebhooksModule,
    InspectionRequestsModule,
    DashboardModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}

import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { InspectionRequestsController } from './inspection-requests.controller';
import { InspectionRequestsService } from './inspection-requests.service';
import { RequestMailService } from './request-mail.service';

@Module({
  imports: [DocumentsModule],
  controllers: [InspectionRequestsController],
  providers: [InspectionRequestsService, RequestMailService],
})
export class InspectionRequestsModule {}

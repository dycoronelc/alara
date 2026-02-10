import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { InspectionRequestsController } from './inspection-requests.controller';
import { InspectionRequestsService } from './inspection-requests.service';

@Module({
  imports: [DocumentsModule],
  controllers: [InspectionRequestsController],
  providers: [InspectionRequestsService],
})
export class InspectionRequestsModule {}

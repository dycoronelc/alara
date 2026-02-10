import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsService } from './documents.service';
import { PdfService } from './pdf.service';

@Module({
  imports: [PrismaModule],
  providers: [DocumentsService, PdfService],
  exports: [DocumentsService],
})
export class DocumentsModule {}

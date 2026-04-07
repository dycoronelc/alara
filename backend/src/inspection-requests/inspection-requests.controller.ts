import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { InspectionRequestsService } from './inspection-requests.service';
import { CreateInspectionRequestDto } from './dto/create-inspection-request.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { DecisionDto } from './dto/decision.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { isInsurerTenantRole } from '../common/app-roles';
import { DocumentsService } from '../documents/documents.service';
import { SaveReportDto } from './dto/save-report.dto';
import { RequestMailService } from './request-mail.service';

@Controller('inspection-requests')
@UseGuards(JwtAuthGuard)
export class InspectionRequestsController {
  private readonly logger = new Logger(InspectionRequestsController.name);

  constructor(
    private readonly service: InspectionRequestsService,
    private readonly documentsService: DocumentsService,
    private readonly requestMailService: RequestMailService,
  ) {}

  @Get()
  async list(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(req.userContext!, {
      status: status as any,
      search,
    });
  }

  @Get('service-types')
  async listServiceTypes(@Req() req: Request) {
    return this.service.listServiceTypes(req.userContext!);
  }

  @Post()
  async create(@Req() req: Request, @Body() payload: CreateInspectionRequestDto) {
    const created = await this.service.create(req.userContext!, payload);
    try {
      const generated = await this.documentsService.generateRequestPdf(
        Number(created.id),
        req.userContext?.userId ?? 0,
        req.userContext,
      );
      try {
        await this.requestMailService.sendRequestCreatedPdf({
          requestNumber: created.request_number,
          pdfFilename: generated.document.filename,
          pdfBuffer: generated.buffer,
        });
      } catch (mailErr) {
        this.logger.warn(
          'No se pudo enviar correo con PDF de solicitud',
          (mailErr as Error)?.message ?? mailErr,
        );
      }
    } catch (err) {
      // No fallar la creación si el PDF falla (ej. FK uploaded_by_user_id); la solicitud ya se guardó
      this.logger.warn('No se pudo generar el PDF de la solicitud', (err as Error)?.message ?? err);
    }
    return created;
  }

  @Get(':id/documents')
  async listDocuments(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.documentsService.listByInspectionRequest(id, req.userContext);
  }

  @Get(':id/documents/:documentId/file')
  async downloadStoredDocument(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id', ParseIntPipe) id: number,
    @Param('documentId', ParseIntPipe) documentId: number,
  ) {
    const { buffer, filename, mimeType } = await this.documentsService.getDocumentFile(
      id,
      documentId,
      req.userContext,
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${filename.replace(/"/g, '')}"`);
    return res.send(buffer);
  }

  @Delete(':id/documents/:documentId')
  async deleteDocument(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Param('documentId', ParseIntPipe) documentId: number,
  ) {
    await this.documentsService.deleteDocument(id, documentId, req.userContext);
    return { ok: true };
  }

  @Post(':id/documents/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadDocument(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('doc_type') docType: string | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('Archivo requerido');
    }
    return this.documentsService.uploadAttachment(id, file, docType, req.userContext);
  }

  @Post(':id/status')
  async updateStatus(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateStatusDto,
  ) {
    return this.service.updateStatus(req.userContext!, id, payload);
  }

  @Post(':id/decision')
  async decide(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: DecisionDto,
  ) {
    return this.service.decide(req.userContext!, id, payload);
  }

  @Patch(':id/client')
  async updateClient(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateClientDto,
  ) {
    return this.service.updateClient(req.userContext!, id, payload);
  }

  @Post(':id/report')
  async saveReport(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: SaveReportDto,
  ) {
    const report = await this.service.saveReport(req.userContext!, id, payload);
    if (payload.generate_report_pdf === true) {
      await this.documentsService.generateReportPdf(id, req.userContext?.userId ?? 0, req.userContext);
    }
    return report;
  }

  @Post(':id/report/share')
  async shareReport(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.service.shareReport(req.userContext!, id);
  }

  @Get(':id/pdf/solicitud')
  async requestPdf(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const { buffer, document } = await this.documentsService.generateRequestPdf(
      id,
      req.userContext?.userId ?? 0,
      req.userContext,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
    return res.send(buffer);
  }

  @Get(':id/pdf/reporte')
  async reportPdf(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (req.userContext && isInsurerTenantRole(req.userContext.role)) {
      const request = await this.service.getById(req.userContext!, id);
      if (!request.report_shared_at) {
        return res.status(403).json({ message: 'Reporte no compartido aún' });
      }
    }
    const { buffer, document } = await this.documentsService.generateReportPdf(
      id,
      req.userContext?.userId ?? 0,
      req.userContext,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
    return res.send(buffer);
  }

  @Post(':id/investigate')
  async triggerInvestigation(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: { sources?: { name: string; url: string }[] },
  ) {
    return this.service.triggerInvestigation(req.userContext!, id, payload.sources ?? []);
  }

  @Post(':id/call/start')
  async startCall(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.startCall(req.userContext!, id);
  }

  @Get(':id/investigations')
  async listInvestigations(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.service.listInvestigations(req.userContext!, id);
  }

  @Get('report-template/default')
  async reportTemplate(@Req() req: Request) {
    return this.service.getReportTemplate(req.userContext!, 'INSPECTION_REPORT_V1');
  }

  @Get(':id')
  async detail(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.service.getById(req.userContext!, id);
  }
}

import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { InspectionRequestsService } from './inspection-requests.service';
import { CreateInspectionRequestDto } from './dto/create-inspection-request.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { DecisionDto } from './dto/decision.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DocumentsService } from '../documents/documents.service';
import { SaveReportDto } from './dto/save-report.dto';

@Controller('inspection-requests')
@UseGuards(JwtAuthGuard)
export class InspectionRequestsController {
  constructor(
    private readonly service: InspectionRequestsService,
    private readonly documentsService: DocumentsService,
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

  @Post()
  async create(@Req() req: Request, @Body() payload: CreateInspectionRequestDto) {
    const created = await this.service.create(req.userContext!, payload);
    await this.documentsService.generateRequestPdf(
      Number(created.id),
      req.userContext?.userId ?? 0,
      req.userContext,
    );
    return created;
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
    await this.documentsService.generateReportPdf(id, req.userContext?.userId ?? 0, req.userContext);
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
    if (req.userContext?.role === 'INSURER') {
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
  async startCall(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
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

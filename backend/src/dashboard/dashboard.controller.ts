import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('insurer')
  async insurer(@Req() req: Request) {
    return this.service.insurerDashboard(req.userContext!);
  }

  @Get('alara')
  async alara(@Req() req: Request) {
    return this.service.alaraDashboard(req.userContext!);
  }
}

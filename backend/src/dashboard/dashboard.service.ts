import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContext } from '../common/request-context.middleware';

type StatusCount = { status: string; total: number };

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async insurerDashboard(context: RequestContext) {
    if (context.role !== 'INSURER') {
      throw new BadRequestException('Solo aseguradoras');
    }
    if (!context.insurerId) {
      throw new BadRequestException('insurerId header requerido');
    }

    const requests = await this.prisma.inspectionRequest.findMany({
      where: { insurer_id: context.insurerId },
      orderBy: { created_at: 'desc' },
    });

    const statusCounts = this.countByStatus(requests);
    const monthlyTrend = this.buildMonthlyTrend(requests);
    const avgDurationDays = this.averageDuration(requests);

    return {
      total: requests.length,
      statusCounts,
      monthlyTrend,
      avgDurationDays,
    };
  }

  async alaraDashboard(context: RequestContext) {
    if (context.role === 'INSURER') {
      throw new BadRequestException('Solo usuarios ALARA');
    }

    const requests = await this.prisma.inspectionRequest.findMany({
      orderBy: { created_at: 'desc' },
    });

    const statusCounts = this.countByStatus(requests);
    const monthlyTrend = this.buildMonthlyTrend(requests);
    const investigatorCounts = await this.prisma.inspectionRequest.groupBy({
      by: ['assigned_investigator_user_id'],
      _count: { id: true },
      where: { assigned_investigator_user_id: { not: null } },
    });

    const investigatorIds = investigatorCounts
      .map((item) => item.assigned_investigator_user_id)
      .filter((id): id is bigint => id !== null);

    const investigatorLookup = await this.prisma.user.findMany({
      where: { id: { in: investigatorIds } },
      select: { id: true, full_name: true },
    });

    const investigatorMap = new Map(investigatorLookup.map((user) => [user.id, user.full_name]));

    return {
      total: requests.length,
      statusCounts,
      monthlyTrend,
      investigators: investigatorCounts.map((item) => ({
        investigator: item.assigned_investigator_user_id
          ? investigatorMap.get(item.assigned_investigator_user_id) ??
            `ID ${item.assigned_investigator_user_id.toString()}`
          : 'Sin asignar',
        total: item._count.id,
      })),
    };
  }

  private countByStatus(requests: { status: string }[]): StatusCount[] {
    const counts = new Map<string, number>();
    requests.forEach((item) => counts.set(item.status, (counts.get(item.status) ?? 0) + 1));
    return Array.from(counts.entries()).map(([status, total]) => ({ status, total }));
  }

  private buildMonthlyTrend(requests: { created_at: Date }[]) {
    const trend = new Map<string, number>();
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    requests.forEach((item) => {
      if (item.created_at < start) {
        return;
      }
      const key = `${item.created_at.getFullYear()}-${item.created_at.getMonth() + 1}`;
      trend.set(key, (trend.get(key) ?? 0) + 1);
    });

    return Array.from(trend.entries()).map(([month, total]) => ({ month, total }));
  }

  private averageDuration(requests: { requested_at: Date; closed_at: Date | null }[]) {
    const durations = requests
      .filter((item) => item.closed_at)
      .map((item) => (item.closed_at!.getTime() - item.requested_at.getTime()) / 86400000);

    if (!durations.length) {
      return 0;
    }

    const sum = durations.reduce((acc, value) => acc + value, 0);
    return Number((sum / durations.length).toFixed(1));
  }
}

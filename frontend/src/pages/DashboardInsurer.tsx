import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ChartCard from '../components/ChartCard';
import StatCard from '../components/StatCard';
import { getInsurerDashboard } from '../data/api';

type StatusCount = { status: string; total: number };
type TrendPoint = { month: string; total: number };

type DashboardData = {
  total: number;
  statusCounts: StatusCount[];
  monthlyTrend: TrendPoint[];
  avgDurationDays: number;
};

const DashboardInsurer = () => {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    getInsurerDashboard().then(setData).catch(() => setData(null));
  }, []);

  const statusData = data?.statusCounts ?? [];
  const trendData = data?.monthlyTrend ?? [];

  return (
    <div className="page">
      <div className="stat-grid">
        <StatCard title="Total de inspecciones" value={data?.total ?? 0} helper="Últimos 12 meses" />
        <StatCard title="Tiempo promedio" value={`${data?.avgDurationDays ?? 0} días`} helper="Ciclo completo" />
        <StatCard title="SLA cumplido" value="92%" helper="Último mes" trend="+4%" />
        <StatCard title="En curso" value={statusData.find((item) => item.status === 'AGENDADA')?.total ?? 0} helper="Agendadas" />
      </div>

      <div className="grid-two">
        <ChartCard title="Tendencia mensual" subtitle="Solicitudes creadas">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="total" stroke="#1D4F7C" fill="#2CD4F8" dot />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribución por estado" subtitle="Solicitudes activas">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Tooltip />
              <Pie data={statusData} dataKey="total" nameKey="status" innerRadius={60} outerRadius={90} fill="#1D4F7C" />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="info-card">
        <h4>Indicadores clave</h4>
        <p>
          Revisa el detalle por asegurado, tiempos promedio por etapa y carga de trabajo por investigador.
          El tablero se sincroniza con el expediente digital para seguimiento completo.
        </p>
      </div>
    </div>
  );
};

export default DashboardInsurer;

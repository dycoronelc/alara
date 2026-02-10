import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ChartCard from '../components/ChartCard';
import StatCard from '../components/StatCard';
import { getAlaraDashboard } from '../data/api';

type StatusCount = { status: string; total: number };
type TrendPoint = { month: string; total: number };
type InvestigatorPoint = { investigator: string; total: number };

type DashboardData = {
  total: number;
  statusCounts: StatusCount[];
  monthlyTrend: TrendPoint[];
  investigators: InvestigatorPoint[];
};

const DashboardAlara = () => {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    getAlaraDashboard().then(setData).catch(() => setData(null));
  }, []);

  return (
    <div className="page">
      <div className="stat-grid">
        <StatCard title="Total en cartera" value={data?.total ?? 0} helper="Todas las aseguradoras" />
        <StatCard title="Productividad" value="84%" helper="Cumplimiento de agenda" trend="+3%" />
        <StatCard
          title="Inspecciones realizadas"
          value={data?.statusCounts.find((item) => item.status === 'REALIZADA')?.total ?? 0}
          helper="Último mes"
        />
        <StatCard title="SLA promedio" value="3.6 días" helper="Solicitud → reporte" />
      </div>

      <div className="grid-two">
        <ChartCard title="Carga por investigador" subtitle="Solicitudes asignadas">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data?.investigators ?? []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="investigator" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#1D4F7C" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tendencia de solicitudes" subtitle="Últimos 6 meses">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data?.monthlyTrend ?? []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill="#2CD4F8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="info-card">
        <h4>Embudo operativo</h4>
        <div className="status-grid">
          {(data?.statusCounts ?? []).map((item) => (
            <div key={item.status} className="status-pill">
              <span>{item.status}</span>
              <strong>{item.total}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardAlara;

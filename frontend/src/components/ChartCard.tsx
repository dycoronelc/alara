import { ReactNode } from 'react';

type ChartCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

const ChartCard = ({ title, subtitle, children }: ChartCardProps) => {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h4>{title}</h4>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      <div className="chart-body">{children}</div>
    </div>
  );
};

export default ChartCard;

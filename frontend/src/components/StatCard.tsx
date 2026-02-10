type StatCardProps = {
  title: string;
  value: string | number;
  helper?: string;
  trend?: string;
};

const StatCard = ({ title, value, helper, trend }: StatCardProps) => {
  return (
    <div className="stat-card">
      <div>
        <p className="stat-title">{title}</p>
        <h3>{value}</h3>
      </div>
      <div className="stat-meta">
        {helper && <span>{helper}</span>}
        {trend && <span className="stat-trend">{trend}</span>}
      </div>
    </div>
  );
};

export default StatCard;

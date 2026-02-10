type StatusBadgeProps = {
  status: string;
};

const statusColors: Record<string, string> = {
  SOLICITADA: 'badge badge-info',
  AGENDADA: 'badge badge-warning',
  REALIZADA: 'badge badge-primary',
  APROBADA: 'badge badge-success',
  RECHAZADA: 'badge badge-danger',
  CANCELADA: 'badge badge-muted',
};

const StatusBadge = ({ status }: StatusBadgeProps) => {
  return <span className={statusColors[status] ?? 'badge'}>{status}</span>;
};

export default StatusBadge;

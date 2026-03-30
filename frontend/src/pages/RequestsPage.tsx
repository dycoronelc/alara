import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import CancelInspectionRequestModal from '../components/CancelInspectionRequestModal';
import { getInspectionRequests, updateInspectionRequestStatus } from '../data/api';

const CANCELLABLE_STATUSES = new Set(['SOLICITADA', 'AGENDADA', 'REALIZADA']);

type RequestItem = {
  id: number;
  request_number: string;
  responsible_name: string;
  status: string;
  created_at: string;
  client_name: string;
  insurer?: string;
};

type RequestsPageProps = {
  portal: 'aseguradora' | 'alara';
};

const RequestsPage = ({ portal }: RequestsPageProps) => {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('TODOS');
  const [cancelTarget, setCancelTarget] = useState<{ id: number; label: string } | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadRequests = useCallback(() => {
    getInspectionRequests(portal)
      .then((data) => {
        const mapped = (data as any[]).map((item) => ({
          id: Number(item.id),
          request_number: item.request_number,
          responsible_name: item.responsible_name,
          status: item.status,
          created_at: item.created_at ?? item.requested_at ?? '',
          client_name: item.client ? `${item.client.first_name} ${item.client.last_name}` : item.client_name,
          insurer: item.insurer?.name ?? item.insurer,
        }));
        setRequests(mapped);
      })
      .catch(() => setRequests([]));
  }, [portal]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleConfirmCancelFromList = async (reason: string) => {
    if (!cancelTarget) return;
    setCancelBusy(true);
    setCancelError(null);
    try {
      await updateInspectionRequestStatus(
        cancelTarget.id,
        {
          new_status: 'CANCELADA',
          note: reason || 'Solicitud cancelada',
          ...(reason ? { cancellation_reason: reason } : {}),
        },
        portal,
      );
      setCancelTarget(null);
      loadRequests();
    } catch {
      setCancelError('No se pudo cancelar. Verifica el estado o los permisos.');
    } finally {
      setCancelBusy(false);
    }
  };

  const filtered = useMemo(() => {
    return requests.filter((item) => {
      const matchesSearch = [item.request_number, item.responsible_name, item.client_name]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesStatus = status === 'TODOS' || item.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [requests, search, status]);

  return (
    <div className="page">
      <div className="filters">
        <input
          type="text"
          placeholder="Buscar por solicitud, cliente o responsable"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="TODOS">Todos</option>
          <option value="SOLICITADA">Solicitada</option>
          <option value="AGENDADA">Agendada</option>
          <option value="REALIZADA">Realizada</option>
          <option value="APROBADA">Aprobada</option>
          <option value="RECHAZADA">Rechazada</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
        <button className="primary-button">Exportar</button>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Número</th>
              <th>Cliente</th>
              <th>Responsable</th>
              {portal === 'alara' && <th>Aseguradora</th>}
              <th>Fecha</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td>{item.request_number}</td>
                <td>{item.client_name}</td>
                <td>{item.responsible_name}</td>
                {portal === 'alara' && <td>{item.insurer ?? '—'}</td>}
                <td>{item.created_at}</td>
                <td>
                  <StatusBadge status={item.status} />
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      className="ghost-button"
                      onClick={() => navigate(`/portal/${portal}/solicitudes/${item.id}`)}
                    >
                      Ver
                    </button>
                    {CANCELLABLE_STATUSES.has(item.status) && (
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => {
                          setCancelError(null);
                          setCancelTarget({
                            id: item.id,
                            label: `${item.request_number} · ${item.client_name}`,
                          });
                        }}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={portal === 'alara' ? 7 : 6} className="empty-state">
                  No hay solicitudes con estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CancelInspectionRequestModal
        open={cancelTarget != null}
        requestLabel={cancelTarget?.label}
        busy={cancelBusy}
        error={cancelError}
        onClose={() => !cancelBusy && setCancelTarget(null)}
        onConfirm={handleConfirmCancelFromList}
      />
    </div>
  );
};

export default RequestsPage;

import { useCallback, useEffect, useState } from 'react';
import { fetchRoles, type RoleRow } from '../data/api';
import { useIsAlaraAdmin } from '../hooks/useIsAlaraAdmin';

const AdminRolesPage = () => {
  const isAdmin = useIsAlaraAdmin();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const r = await fetchRoles();
      setRoles(Array.isArray(r) ? r : []);
    } catch {
      setError('No se pudo cargar la lista de roles.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  if (!isAdmin) {
    return (
      <div className="page">
        <div className="info-card">
          <h3>Acceso restringido</h3>
          <p>Solo los administradores pueden gestionar roles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="info-card">
        <h3>Roles del sistema</h3>
        <p>
          Catálogo alineado con <code>users.user_type</code>: INSURER_USER, ALARA_USER, ADMIN, BROKER_USER.
        </p>
      </div>
      <div className="info-card">
        {loading && <p>Cargando…</p>}
        {error && <p className="form-message form-message--error">{error}</p>}
        <div className="list-block">
          {roles.map((r) => (
            <div key={String(r.id)} className="list-row">
              <div>
                <strong>{r.name}</strong>
                <span>{r.code}</span>
              </div>
            </div>
          ))}
          {!roles.length && !loading && <p>No hay roles.</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminRolesPage;

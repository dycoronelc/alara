import { useCallback, useEffect, useState } from 'react';
import { deleteRoleAdmin, fetchRoles, updateRoleAdmin, type RoleRow } from '../data/api';
import { useIsAlaraAdmin } from '../hooks/useIsAlaraAdmin';

const AdminRolesPage = () => {
  const isAdmin = useIsAlaraAdmin();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [editName, setEditName] = useState('');

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

  const openEdit = (r: RoleRow) => {
    setEditing(r);
    setEditName(r.name);
    setMessage('');
  };

  const closeEdit = () => {
    setEditing(null);
    setEditName('');
  };

  const handleSaveRole = async () => {
    if (!editing) return;
    const name = editName.trim();
    if (!name) {
      setMessage('Indica un nombre para el rol.');
      return;
    }
    try {
      await updateRoleAdmin(editing.id, { name });
      setMessage('Rol actualizado.');
      closeEdit();
      await load();
    } catch {
      setMessage('No se pudo guardar el rol.');
    }
  };

  const handleDelete = async (r: RoleRow) => {
    if (
      !window.confirm(
        `¿Eliminar el rol «${r.name}» (${r.code})? Solo es posible si no hay usuarios con este rol.`,
      )
    ) {
      return;
    }
    setMessage('');
    try {
      await deleteRoleAdmin(r.id);
      setMessage('Rol eliminado.');
      if (editing?.id === r.id) closeEdit();
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No se pudo eliminar el rol.');
    }
  };

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
          Puedes editar el nombre mostrado de cada rol. El código interno (<code>users.user_type</code>) no se
          modifica. Eliminar solo está permitido si ningún usuario tiene asignado ese rol.
        </p>
      </div>
      <div className="info-card">
        {loading && <p>Cargando…</p>}
        {error && <p className="form-message form-message--error">{error}</p>}
        {message && <p className="form-message">{message}</p>}

        {editing && (
          <div className="info-card" style={{ marginBottom: '1rem', border: '1px solid var(--alara-border)' }}>
            <h4>Editar rol: {editing.code}</h4>
            <div className="form-grid form-grid--tight">
              <label className="form-field">
                <span>Nombre visible</span>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </label>
            </div>
            <div className="form-actions">
              <button type="button" className="primary-button" onClick={handleSaveRole}>
                Guardar
              </button>
              <button type="button" className="ghost-button" onClick={closeEdit}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="list-block">
          {roles.map((r) => (
            <div key={String(r.id)} className="list-row">
              <div>
                <strong>{r.name}</strong>
                <span>{r.code}</span>
              </div>
              <div className="file-actions">
                <button type="button" className="ghost-button" onClick={() => openEdit(r)}>
                  Editar
                </button>
                <button type="button" className="ghost-button" onClick={() => handleDelete(r)}>
                  Eliminar
                </button>
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

import { useCallback, useEffect, useState } from 'react';
import {
  createUserAdmin,
  deleteUserAdmin,
  fetchInsurersForAdmin,
  fetchUsers,
  updateUserAdmin,
  type InsurerOption,
  type UserRow,
} from '../data/api';
import { useIsAlaraAdmin } from '../hooks/useIsAlaraAdmin';

type RoleCode = 'INSURER_USER' | 'ALARA_USER' | 'ADMIN' | 'BROKER_USER';

function primaryRoleCode(u: UserRow): RoleCode {
  const c = u.roles[0]?.code;
  if (c === 'INSURER_USER' || c === 'ALARA_USER' || c === 'ADMIN' || c === 'BROKER_USER') {
    return c;
  }
  if (u.user_type === 'INSURER_USER' || u.user_type === 'ALARA_USER' || u.user_type === 'ADMIN' || u.user_type === 'BROKER_USER') {
    return u.user_type;
  }
  return 'ALARA_USER';
}

const AdminUsersPage = () => {
  const isAdmin = useIsAlaraAdmin();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [insurers, setInsurers] = useState<InsurerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userMessage, setUserMessage] = useState('');

  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRoleCode, setNewRoleCode] = useState<RoleCode>('INSURER_USER');
  const [newInsurerId, setNewInsurerId] = useState<number | ''>('');

  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRoleCode, setEditRoleCode] = useState<RoleCode>('INSURER_USER');
  const [editInsurerId, setEditInsurerId] = useState<number | ''>('');
  const [editActive, setEditActive] = useState(true);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const [u, ins] = await Promise.all([fetchUsers(), fetchInsurersForAdmin()]);
      setUsers(Array.isArray(u) ? u : []);
      setInsurers(Array.isArray(ins) ? ins : []);
    } catch {
      setError('No se pudo cargar la lista de usuarios.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (u: UserRow) => {
    setEditing(u);
    setEditEmail(u.email);
    setEditPhone(u.phone || '');
    setEditFullName(u.full_name);
    setEditPassword('');
    setEditRoleCode(primaryRoleCode(u));
    setEditInsurerId(u.insurer?.id != null ? Number(u.insurer.id) : '');
    setEditActive(u.is_active);
    setUserMessage('');
  };

  const closeEdit = () => {
    setEditing(null);
    setEditPassword('');
  };

  const handleCreateUser = async () => {
    setUserMessage('');
    if (!newEmail.trim() || !newPhone.trim() || !newFullName.trim() || newPassword.length < 8) {
      setUserMessage('Completa correo, teléfono, nombre y contraseña (mín. 8 caracteres).');
      return;
    }
    if ((newRoleCode === 'INSURER_USER' || newRoleCode === 'BROKER_USER') && newInsurerId === '') {
      setUserMessage('Selecciona una aseguradora para este rol.');
      return;
    }
    try {
      await createUserAdmin({
        email: newEmail.trim(),
        phone: newPhone.trim(),
        full_name: newFullName.trim(),
        password: newPassword,
        role_code: newRoleCode,
        ...(newInsurerId !== '' ? { insurer_id: Number(newInsurerId) } : {}),
      });
      setUserMessage('Usuario creado.');
      setNewEmail('');
      setNewPhone('');
      setNewFullName('');
      setNewPassword('');
      setNewInsurerId('');
      await load();
    } catch {
      setUserMessage('No se pudo crear el usuario (correo duplicado o datos inválidos).');
    }
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setUserMessage('');
    if (!editEmail.trim() || !editPhone.trim() || !editFullName.trim()) {
      setUserMessage('Completa correo, teléfono y nombre.');
      return;
    }
    if ((editRoleCode === 'INSURER_USER' || editRoleCode === 'BROKER_USER') && editInsurerId === '') {
      setUserMessage('Selecciona una aseguradora para este rol.');
      return;
    }
    if (editPassword.length > 0 && editPassword.length < 8) {
      setUserMessage('La contraseña debe tener al menos 8 caracteres o déjala vacía.');
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        email: editEmail.trim(),
        phone: editPhone.trim(),
        full_name: editFullName.trim(),
        is_active: editActive,
        role_code: editRoleCode,
      };
      if (editPassword.length >= 8) {
        payload.password = editPassword;
      }
      if (editRoleCode === 'INSURER_USER' || editRoleCode === 'BROKER_USER') {
        payload.insurer_id = Number(editInsurerId);
      }
      await updateUserAdmin(editing.id, payload);
      setUserMessage('Usuario actualizado.');
      closeEdit();
      await load();
    } catch {
      setUserMessage('No se pudo guardar los cambios.');
    }
  };

  const handleDeactivate = async (u: UserRow) => {
    const selfId = Number(localStorage.getItem('alara-user-id') || '0');
    if (u.id === selfId) {
      setUserMessage('No puedes desactivar tu propio usuario.');
      return;
    }
    if (!window.confirm(`¿Desactivar a ${u.full_name}? Podrás reactivarlo editando el usuario.`)) {
      return;
    }
    setUserMessage('');
    try {
      await deleteUserAdmin(u.id);
      setUserMessage('Usuario desactivado.');
      if (editing?.id === u.id) closeEdit();
      await load();
    } catch {
      setUserMessage('No se pudo desactivar el usuario.');
    }
  };

  if (!isAdmin) {
    return (
      <div className="page">
        <div className="info-card">
          <h3>Acceso restringido</h3>
          <p>Solo los administradores pueden gestionar usuarios.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="info-card">
        <h3>Usuarios</h3>
        <p>Alta, edición y baja lógica (desactivar). Los datos sensibles requieren confirmación.</p>
      </div>
      <div className="info-card">
        {loading && <p>Cargando…</p>}
        {error && <p className="form-message form-message--error">{error}</p>}
        <div className="form-grid form-grid--tight">
          <label className="form-field">
            <span>Correo</span>
            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoComplete="off" />
          </label>
          <label className="form-field">
            <span>Teléfono</span>
            <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
          </label>
          <label className="form-field">
            <span>Nombre completo</span>
            <input value={newFullName} onChange={(e) => setNewFullName(e.target.value)} />
          </label>
          <label className="form-field">
            <span>Contraseña inicial</span>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </label>
          <label className="form-field">
            <span>Rol</span>
            <select value={newRoleCode} onChange={(e) => setNewRoleCode(e.target.value as RoleCode)}>
              <option value="ADMIN">Administrador</option>
              <option value="INSURER_USER">Usuario aseguradora</option>
              <option value="ALARA_USER">Usuario ALARA</option>
              <option value="BROKER_USER">Corredor</option>
            </select>
          </label>
          {(newRoleCode === 'INSURER_USER' || newRoleCode === 'BROKER_USER') && (
            <label className="form-field">
              <span>Aseguradora</span>
              <select
                value={newInsurerId === '' ? '' : String(newInsurerId)}
                onChange={(e) => setNewInsurerId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Seleccione…</option>
                {insurers.map((ins) => (
                  <option key={String(ins.id)} value={String(ins.id)}>
                    {ins.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="form-actions">
          <button type="button" className="primary-button" onClick={handleCreateUser}>
            Crear usuario
          </button>
          {userMessage && <span className="form-message">{userMessage}</span>}
        </div>

        {editing && (
          <div className="info-card" style={{ marginTop: '1.25rem', border: '1px solid var(--alara-border)' }}>
            <h4>Editar usuario: {editing.full_name}</h4>
            <div className="form-grid form-grid--tight">
              <label className="form-field">
                <span>Correo</span>
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} autoComplete="off" />
              </label>
              <label className="form-field">
                <span>Teléfono</span>
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Nombre completo</span>
                <input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Nueva contraseña (opcional)</span>
                <input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Dejar vacío para no cambiar" />
              </label>
              <label className="form-field">
                <span>Rol</span>
                <select value={editRoleCode} onChange={(e) => setEditRoleCode(e.target.value as RoleCode)}>
                  <option value="ADMIN">Administrador</option>
                  <option value="INSURER_USER">Usuario aseguradora</option>
                  <option value="ALARA_USER">Usuario ALARA</option>
                  <option value="BROKER_USER">Corredor</option>
                </select>
              </label>
              {(editRoleCode === 'INSURER_USER' || editRoleCode === 'BROKER_USER') && (
                <label className="form-field">
                  <span>Aseguradora</span>
                  <select
                    value={editInsurerId === '' ? '' : String(editInsurerId)}
                    onChange={(e) => setEditInsurerId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Seleccione…</option>
                    {insurers.map((ins) => (
                      <option key={String(ins.id)} value={String(ins.id)}>
                        {ins.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="form-field">
                <span>Usuario activo</span>
                <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
              </label>
            </div>
            <div className="form-actions">
              <button type="button" className="primary-button" onClick={handleSaveEdit}>
                Guardar cambios
              </button>
              <button type="button" className="ghost-button" onClick={closeEdit}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="list-block" style={{ marginTop: '1rem' }}>
          {users.map((u) => (
            <div key={u.id} className="list-row">
              <div>
                <strong>{u.full_name}</strong>
                <span>
                  {u.email} · {u.phone || '—'} · {u.roles.map((x) => x.name).join(', ') || u.user_type}
                  {!u.is_active ? ' · inactivo' : ''}
                </span>
              </div>
              <div className="file-actions">
                <button type="button" className="ghost-button" onClick={() => openEdit(u)}>
                  Editar
                </button>
                {u.is_active && (
                  <button type="button" className="ghost-button" onClick={() => handleDeactivate(u)}>
                    Desactivar
                  </button>
                )}
              </div>
            </div>
          ))}
          {!users.length && !loading && <p>No hay usuarios.</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminUsersPage;

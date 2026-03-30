import { useCallback, useEffect, useState } from 'react';
import {
  createUserAdmin,
  fetchInsurersForAdmin,
  fetchUsers,
  type InsurerOption,
  type UserRow,
} from '../data/api';
import { useIsAlaraAdmin } from '../hooks/useIsAlaraAdmin';

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
  const [newRoleCode, setNewRoleCode] = useState<'INSURER_USER' | 'ALARA_USER' | 'ADMIN' | 'BROKER_USER'>(
    'INSURER_USER',
  );
  const [newInsurerId, setNewInsurerId] = useState<number | ''>('');

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
        <p>Alta y consulta de usuarios (correo, teléfono y rol).</p>
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
            <select value={newRoleCode} onChange={(e) => setNewRoleCode(e.target.value as typeof newRoleCode)}>
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
            </div>
          ))}
          {!users.length && !loading && <p>No hay usuarios.</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminUsersPage;

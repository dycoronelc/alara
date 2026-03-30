import { useCallback, useEffect, useState } from 'react';
import {
  createUserAdmin,
  fetchInsurersForAdmin,
  fetchRoles,
  fetchUsers,
  type InsurerOption,
  type RoleRow,
  type UserRow,
} from '../data/api';

type SourceItem = { name: string; url: string };

const STORAGE_KEY = 'alara-investigation-sources';

const AdminPage = () => {
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const isAdmin = typeof window !== 'undefined' && localStorage.getItem('alara-role') === 'ADMIN';

  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [insurers, setInsurers] = useState<InsurerOption[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [userMessage, setUserMessage] = useState('');

  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRoleCode, setNewRoleCode] = useState<'ADMIN' | 'INSURER' | 'BROKER'>('INSURER');
  const [newInsurerId, setNewInsurerId] = useState<number | ''>('');

  const loadAdminData = useCallback(async () => {
    if (!isAdmin) return;
    setAdminLoading(true);
    setAdminError('');
    try {
      const [r, u, ins] = await Promise.all([fetchRoles(), fetchUsers(), fetchInsurersForAdmin()]);
      setRoles(Array.isArray(r) ? r : []);
      setUsers(Array.isArray(u) ? u : []);
      setInsurers(Array.isArray(ins) ? ins : []);
    } catch {
      setAdminError('No se pudo cargar roles o usuarios. ¿Iniciaste sesión como administrador?');
    } finally {
      setAdminLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSources(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const persist = (items: SourceItem[]) => {
    setSources(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  };

  const handleCreateUser = async () => {
    setUserMessage('');
    if (!newEmail.trim() || !newPhone.trim() || !newFullName.trim() || newPassword.length < 8) {
      setUserMessage('Completa correo, teléfono, nombre y contraseña (mín. 8 caracteres).');
      return;
    }
    if ((newRoleCode === 'INSURER' || newRoleCode === 'BROKER') && newInsurerId === '') {
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
      await loadAdminData();
    } catch {
      setUserMessage('No se pudo crear el usuario (correo duplicado o datos inválidos).');
    }
  };

  return (
    <div className="page">
      <div className="info-card">
        <h3>Administración</h3>
        <p>Gestión de usuarios, roles, aseguradoras y catálogos.</p>
      </div>

      {isAdmin && (
        <div className="grid-two" style={{ marginBottom: '1rem' }}>
          <div className="info-card">
            <h4>Roles del sistema</h4>
            {adminLoading && <p>Cargando…</p>}
            {adminError && <p className="form-message form-message--error">{adminError}</p>}
            <div className="list-block">
              {roles.map((r) => (
                <div key={String(r.id)} className="list-row">
                  <div>
                    <strong>{r.name}</strong>
                    <span>{r.code}</span>
                  </div>
                </div>
              ))}
              {!roles.length && !adminLoading && <p>No hay roles.</p>}
            </div>
          </div>

          <div className="info-card">
            <h4>Usuarios</h4>
            <p>Alta de usuario con correo, teléfono y rol (Administrador, Aseguradora o Corredor).</p>
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
                  <option value="INSURER">Aseguradora</option>
                  <option value="BROKER">Corredor</option>
                </select>
              </label>
              {(newRoleCode === 'INSURER' || newRoleCode === 'BROKER') && (
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
              {!users.length && !adminLoading && <p>No hay usuarios.</p>}
            </div>
          </div>
        </div>
      )}

      {!isAdmin && (
        <div className="info-card" style={{ marginBottom: '1rem' }}>
          <p>
            Los módulos de <strong>roles</strong> y <strong>usuarios</strong> solo están disponibles para cuentas con
            rol Administrador.
          </p>
        </div>
      )}

      <div className="grid-two">
        <div className="info-card">
          <h4>Fuentes para Investigaciones (n8n)</h4>
          <div className="form-grid">
            <label className="form-field">
              <span>Nombre</span>
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="form-field">
              <span>URL</span>
              <input value={url} onChange={(event) => setUrl(event.target.value)} />
            </label>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                if (!name || !url) return;
                persist([...sources, { name, url }]);
                setName('');
                setUrl('');
              }}
            >
              Agregar fuente
            </button>
          </div>
          <div className="list-block">
            {sources.map((item, index) => (
              <div key={`${item.name}-${index}`} className="list-row">
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.url}</span>
                </div>
                <button type="button" className="ghost-button" onClick={() => persist(sources.filter((_, idx) => idx !== index))}>
                  Quitar
                </button>
              </div>
            ))}
            {!sources.length && <p>No hay fuentes configuradas.</p>}
          </div>
        </div>
        <div className="info-card">
          <h4>Integraciones</h4>
          <ul className="details-list">
            <li>
              <span>Google Calendar</span>
              <strong>Activo</strong>
            </li>
            <li>
              <span>n8n Webhooks</span>
              <strong>Activo</strong>
            </li>
            <li>
              <span>Notificaciones</span>
              <strong>SMTP + WhatsApp</strong>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;

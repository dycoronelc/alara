import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { loginRequest } from '../data/api';
import PasswordFieldWithToggle from '../components/PasswordFieldWithToggle';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = await loginRequest(email, password);
    if (!result.ok) {
      setError(result.message);
      if (import.meta.env.DEV) {
        console.warn('[login]', result.reason, result.message);
      }
      return;
    }

    const { data } = result;
    localStorage.setItem('alara-token', data.access_token);
    localStorage.setItem('alara-role', data.user.role);
    localStorage.setItem('alara-user-id', String(data.user.id));
    localStorage.setItem(
      'alara-user',
      JSON.stringify({
        full_name: data.user.full_name,
        email: data.user.email,
        phone: data.user.phone ?? '',
        role: data.user.role,
        role_codes: data.user.role_codes ?? [],
      }),
    );
    if (data.user.insurer_id) {
      localStorage.setItem('alara-insurer-id', String(data.user.insurer_id));
    } else {
      localStorage.removeItem('alara-insurer-id');
    }
    if (data.user.role === 'INSURER' || data.user.role === 'BROKER') {
      navigate('/portal/aseguradora/dashboard');
    } else {
      navigate('/portal/alara/dashboard');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <img src="/logo.png" alt="ALARA INSP" />
        <h2>Plataforma de Inspecciones VIP</h2>
        <p>Ingresa tus credenciales para continuar.</p>
        <form className="login-form" onSubmit={handleLogin}>
          <div className="login-field">
            <label htmlFor="login-email" className="login-field-label">
              Correo electrónico
            </label>
            <input
              id="login-email"
              type="email"
              placeholder="Correo"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <PasswordFieldWithToggle
            id="login-password"
            label="Contraseña"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            required
          />
          <div className="login-forgot-row">
            <Link to="/recuperar-contrasena" className="login-forgot-link">
              ¿Olvidó su contraseña?
            </Link>
          </div>
          {error && <span className="error-text">{error}</span>}
          <div className="login-actions login-actions--in-form">
            <button type="submit" className="primary-button">
              Iniciar sesión
            </button>
          </div>
        </form>
        <div className="login-hint">
          <h4>Usuarios de prueba</h4>
          <ul>
            <li>
              <strong>PALIG</strong> — insurer@palig.com / Insurer123!
            </li>
            <li>
              <strong>ASSA</strong> — insurer@assa.com / Insurer123!
            </li>
            <li>
              <strong>ALARA INSP</strong> — alara@alarains.com / Alara123!
            </li>
            <li>
              <strong>Admin</strong> — admin@alarains.com / Admin123!
            </li>
          </ul>
        </div>
      </div>
      <div className="login-side">
        <h1>ALARA INSP, S.A.</h1>
        <p>
          Gestión integral de inspecciones VIP con trazabilidad, dashboards y expedientes digitales.
        </p>
        <ul>
          <li>Solicitud y seguimiento en tiempo real.</li>
          <li>Agenda y coordinación multi-investigador.</li>
          <li>Reportes estructurados con métricas clave.</li>
        </ul>
      </div>
    </div>
  );
};

export default LoginPage;

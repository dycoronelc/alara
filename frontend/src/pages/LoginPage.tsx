import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { login } from '../data/api';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    try {
      const response = await login(email, password);
      if (!response.ok) {
        throw new Error('Credenciales inválidas');
      }
      const data = await response.json();
      localStorage.setItem('alara-token', data.access_token);
      localStorage.setItem('alara-role', data.user.role);
      if (data.user.insurer_id) {
        localStorage.setItem('alara-insurer-id', String(data.user.insurer_id));
      } else {
        localStorage.removeItem('alara-insurer-id');
      }
      if (data.user.role === 'INSURER') {
        navigate('/portal/aseguradora/dashboard');
      } else {
        navigate('/portal/alara/dashboard');
      }
    } catch (err) {
      setError('No se pudo iniciar sesión. Verifica tus credenciales.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <img src="/logo.png" alt="ALARA INSP" />
        <h2>Plataforma de Inspecciones VIP</h2>
        <p>Ingresa tus credenciales para continuar.</p>
        <div className="login-form">
          <input
            type="email"
            placeholder="Correo"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error && <span className="error-text">{error}</span>}
        </div>
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
        <div className="login-actions">
          <button
            className="primary-button"
            onClick={handleLogin}
          >
            Iniciar sesión
          </button>
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

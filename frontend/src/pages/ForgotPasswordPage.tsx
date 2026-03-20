import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PasswordFieldWithToggle from '../components/PasswordFieldWithToggle';
import { forgotPassword, resetPassword, type ForgotPasswordResponse } from '../data/api';

function parseApiError(data: unknown): string {
  if (!data || typeof data !== 'object') return 'Error desconocido';
  const d = data as { message?: string | string[] };
  if (Array.isArray(d.message)) return d.message.join(', ');
  if (typeof d.message === 'string') return d.message;
  return 'Solicitud no válida';
}

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token')?.trim() ?? '';

  const [email, setEmail] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [manualCodeMode, setManualCodeMode] = useState(false);

  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const effectiveToken = tokenFromUrl || manualToken.trim();

  useEffect(() => {
    if (tokenFromUrl) {
      setManualCodeMode(false);
      setManualToken('');
    }
  }, [tokenFromUrl]);

  const clearUrlToken = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('token');
    setSearchParams(next, { replace: true });
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setDevToken(null);
    setLoading(true);
    try {
      const res = await forgotPassword(email.trim());
      const data = (await res.json().catch(() => ({}))) as ForgotPasswordResponse & { message?: string };
      if (!res.ok) {
        throw new Error(parseApiError(data));
      }
      setMessage(
        'Si el correo está registrado en la plataforma, recibirás instrucciones para restablecer tu contraseña.',
      );
      if (data.debug_reset_token) {
        setDevToken(data.debug_reset_token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (newPass.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPass !== confirmPass) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (!effectiveToken) {
      setError('Falta el código de restablecimiento.');
      return;
    }
    setLoading(true);
    try {
      const res = await resetPassword(effectiveToken, newPass);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(parseApiError(data));
      }
      setMessage('Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión.');
      setNewPass('');
      setConfirmPass('');
      setManualToken('');
      clearUrlToken();
      setManualCodeMode(false);
      setTimeout(() => navigate('/'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enlace inválido o expirado.');
    } finally {
      setLoading(false);
    }
  };

  /** Pantalla 1: pedir correo */
  const showRequestForm = !tokenFromUrl && !manualCodeMode;
  /** Pantalla 2: código manual + contraseñas */
  const showManualResetForm = !tokenFromUrl && manualCodeMode;
  /** Pantalla 3: solo contraseñas (enlace con ?token=) */
  const showUrlResetForm = Boolean(tokenFromUrl);

  return (
    <div className="login-page">
      <div className="login-card login-card--wide">
        <img src="/logo.png" alt="ALARA INSP" />
        <h2>
          {showRequestForm ? 'Recuperar contraseña' : null}
          {showManualResetForm || showUrlResetForm ? 'Nueva contraseña' : null}
        </h2>
        <p>
          {showRequestForm
            ? 'Indica el correo con el que te registraste. Recibirás un enlace o código según la configuración del sistema.'
            : 'Escribe una contraseña segura (mínimo 8 caracteres).'}
        </p>

        {error && <span className="error-text">{error}</span>}
        {message && <span className="form-message form-message--success">{message}</span>}

        {showRequestForm && (
          <form className="login-form" onSubmit={handleRequestReset}>
            <div className="login-field">
              <label htmlFor="recover-email" className="login-field-label">
                Correo electrónico
              </label>
              <input
                id="recover-email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="login-actions">
              <button type="submit" className="primary-button" disabled={loading}>
                {loading ? 'Enviando…' : 'Enviar instrucciones'}
              </button>
              <button
                type="button"
                className="ghost-button login-link-button"
                onClick={() => {
                  setManualCodeMode(true);
                  setError('');
                  setMessage('');
                }}
              >
                Ya tengo un código de restablecimiento
              </button>
              <Link to="/" className="login-back-link">
                Volver al inicio de sesión
              </Link>
            </div>
          </form>
        )}

        {showManualResetForm && (
          <form className="login-form" onSubmit={handleReset}>
            <div className="login-field">
              <label htmlFor="reset-token" className="login-field-label">
                Código o token
              </label>
              <input
                id="reset-token"
                type="text"
                placeholder="Pega el código que recibiste"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                autoComplete="one-time-code"
                required
              />
            </div>
            <PasswordFieldWithToggle
              id="new-pw-manual-1"
              label="Nueva contraseña"
              placeholder="Mínimo 8 caracteres"
              value={newPass}
              onChange={setNewPass}
              autoComplete="new-password"
            />
            <PasswordFieldWithToggle
              id="new-pw-manual-2"
              label="Confirmar contraseña"
              placeholder="Repite la contraseña"
              value={confirmPass}
              onChange={setConfirmPass}
              autoComplete="new-password"
            />
            <div className="login-actions">
              <button type="submit" className="primary-button" disabled={loading}>
                {loading ? 'Guardando…' : 'Guardar contraseña'}
              </button>
              <button
                type="button"
                className="ghost-button login-link-button"
                onClick={() => {
                  setManualCodeMode(false);
                  setManualToken('');
                  setNewPass('');
                  setConfirmPass('');
                  setError('');
                }}
              >
                Solicitar código por correo
              </button>
              <Link to="/" className="login-back-link">
                Volver al inicio de sesión
              </Link>
            </div>
          </form>
        )}

        {showUrlResetForm && (
          <form className="login-form" onSubmit={handleReset}>
            <p className="login-token-hint">Restableciendo cuenta con enlace seguro.</p>
            <PasswordFieldWithToggle
              id="new-pw-url-1"
              label="Nueva contraseña"
              placeholder="Mínimo 8 caracteres"
              value={newPass}
              onChange={setNewPass}
              autoComplete="new-password"
            />
            <PasswordFieldWithToggle
              id="new-pw-url-2"
              label="Confirmar contraseña"
              placeholder="Repite la contraseña"
              value={confirmPass}
              onChange={setConfirmPass}
              autoComplete="new-password"
            />
            <div className="login-actions">
              <button type="submit" className="primary-button" disabled={loading}>
                {loading ? 'Guardando…' : 'Guardar contraseña'}
              </button>
              <Link to="/recuperar-contrasena" className="login-back-link" onClick={() => clearUrlToken()}>
                Solicitar otro código
              </Link>
              <Link to="/" className="login-back-link">
                Volver al inicio de sesión
              </Link>
            </div>
          </form>
        )}

        {devToken && (
          <div className="login-dev-token" role="status">
            <strong>Solo desarrollo:</strong> copia este token para probar el restablecimiento sin correo.
            <code>{devToken}</code>
            <button
              type="button"
              className="ghost-button login-dev-token__btn"
              onClick={() => {
                setSearchParams({ token: devToken }, { replace: true });
                setDevToken(null);
                setMessage('');
              }}
            >
              Continuar para restablecer contraseña
            </button>
          </div>
        )}
      </div>
      <div className="login-side">
        <h1>ALARA INSP, S.A.</h1>
        <p>Recupera el acceso de forma segura. Los enlaces de restablecimiento caducan pasado un tiempo.</p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

type InactivityModalProps = {
  onClose: () => void;
};

export default function InactivityModal({ onClose }: InactivityModalProps) {
  return (
    <div className="inactivity-overlay" role="dialog" aria-modal="true" aria-labelledby="inactivity-title">
      <div className="inactivity-modal">
        <h2 id="inactivity-title">Sesión por inactividad</h2>
        <p>
          Han transcurrido 20 minutos sin actividad. Por seguridad, su sesión se cerrará y será redirigido al inicio
          de sesión.
        </p>
        <button type="button" className="primary-button" onClick={onClose}>
          Ir al inicio de sesión
        </button>
      </div>
    </div>
  );
}

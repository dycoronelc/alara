import { useNavigate } from 'react-router-dom';

const ExecutionPage = () => {
  const navigate = useNavigate();

  return (
    <div className="page">
      <div className="info-card">
        <h3>Ejecución de entrevista</h3>
        <p>
          Selecciona una solicitud desde la bandeja para ejecutar el formulario completo del reporte.
        </p>
        <div className="action-row">
          <button className="primary-button" onClick={() => navigate('/portal/alara/solicitudes')}>
            Ir a Bandeja
          </button>
          <button className="ghost-button">Historial de ejecuciones</button>
        </div>
      </div>
    </div>
  );
};

export default ExecutionPage;

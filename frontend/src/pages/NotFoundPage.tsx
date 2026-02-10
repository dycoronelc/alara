import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="page">
      <div className="info-card">
        <h3>Página no encontrada</h3>
        <p>Regresa al portal principal para continuar.</p>
        <Link to="/" className="primary-button">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;

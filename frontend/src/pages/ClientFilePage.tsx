const ClientFilePage = () => {
  return (
    <div className="page">
      <div className="info-card">
        <h3>Expediente digital</h3>
        <p>Accede a la solicitud, reporte, evidencias y bitácora completa.</p>
      </div>

      <div className="grid-two">
        <div className="info-card">
          <h4>Datos del cliente</h4>
          <ul className="details-list">
            <li>
              <span>Nombre</span>
              <strong>Paola Ríos</strong>
            </li>
            <li>
              <span>Documento</span>
              <strong>Pasaporte 1234567</strong>
            </li>
            <li>
              <span>Correo</span>
              <strong>paola.rios@email.com</strong>
            </li>
            <li>
              <span>Profesión</span>
              <strong>Directora financiera</strong>
            </li>
          </ul>
        </div>
        <div className="info-card">
          <h4>Documentos</h4>
          <div className="file-row">
            <span>Solicitud PDF</span>
            <button className="ghost-button">Descargar</button>
          </div>
          <div className="file-row">
            <span>Reporte de inspección</span>
            <button className="ghost-button">Descargar</button>
          </div>
          <div className="file-row">
            <span>Autorizaciones</span>
            <button className="ghost-button">Ver</button>
          </div>
        </div>
      </div>

      <div className="info-card">
        <h4>Línea de tiempo</h4>
        <div className="timeline">
          <div>
            <span>23 Ene</span>
            <p>Solicitud creada por Aseguradora Horizonte.</p>
          </div>
          <div>
            <span>24 Ene</span>
            <p>Inspección agendada y sincronizada con calendario.</p>
          </div>
          <div>
            <span>25 Ene</span>
            <p>Entrevista completada, reporte cargado.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientFilePage;

type CalendarPageProps = {
  portal: 'aseguradora' | 'alara';
};

const CalendarPage = ({ portal }: CalendarPageProps) => {
  return (
    <div className="page">
      <div className="calendar-header">
        <div>
          <h3>Agenda de inspecciones</h3>
          <p>Vista semanal sincronizada con Google Calendar.</p>
        </div>
        <button className="primary-button">Sincronizar</button>
      </div>

      <div className="calendar-grid">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie'].map((day) => (
          <div key={day} className="calendar-column">
            <h4>{day}</h4>
            <div className="calendar-event">
              <span>09:00</span>
              <strong>Entrevista VIP - Caso 1024</strong>
              <p>{portal === 'alara' ? 'Investigador: M. Rivera' : 'ALARA INSP'}</p>
            </div>
            <div className="calendar-event light">
              <span>15:30</span>
              <strong>Seguimiento documental</strong>
              <p>Estado: Validación</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarPage;

import { useState } from 'react';
import { createInspectionRequest } from '../data/api';

const initialState = {
  responsible_name: '',
  responsible_phone: '',
  responsible_email: '',
  first_name: '',
  last_name: '',
  request_number: '',
  agent_name: '',
  insured_amount: '',
  has_amount_in_force: false,
  address_line: '',
  city: '',
  country: '',
  dob: '',
  id_type: '',
  id_number: '',
  employer_name: '',
  employer_tax_id: '',
  profession: '',
  tasks: '',
  phone_home: '',
  phone_work: '',
  phone_mobile: '',
  email: '',
  marital_status: '',
  comments: '',
  client_notified: false,
  interview_language: '',
};

const NewRequestPage = () => {
  const [form, setForm] = useState(initialState);
  const [message, setMessage] = useState('');

  const updateField = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setMessage('');
    const payload = {
      request_number: form.request_number,
      agent_name: form.agent_name,
      insured_amount: form.insured_amount ? Number(form.insured_amount) : undefined,
      has_amount_in_force: form.has_amount_in_force,
      responsible_name: form.responsible_name,
      responsible_phone: form.responsible_phone,
      responsible_email: form.responsible_email,
      marital_status: form.marital_status,
      comments: [
        form.comments,
        form.address_line ? `Dirección: ${form.address_line}` : '',
        form.city ? `Ciudad: ${form.city}` : '',
        form.country ? `País: ${form.country}` : '',
        form.tasks ? `Tareas: ${form.tasks}` : '',
        form.phone_work ? `Teléfono Laboral: ${form.phone_work}` : '',
      ]
        .filter(Boolean)
        .join(' | '),
      client_notified: form.client_notified,
      interview_language: form.interview_language,
      client: {
        first_name: form.first_name,
        last_name: form.last_name,
        dob: form.dob || undefined,
        id_type: form.id_type || undefined,
        id_number: form.id_number || undefined,
        email: form.email || undefined,
        phone_mobile: form.phone_mobile || undefined,
        phone_home: form.phone_home || undefined,
        employer_name: form.employer_name || undefined,
        employer_tax_id: form.employer_tax_id || undefined,
        profession: form.profession || undefined,
      },
    };

    try {
      await createInspectionRequest(payload);
      setMessage('Solicitud creada correctamente.');
      setForm(initialState);
    } catch (error) {
      setMessage('No se pudo crear la solicitud. Verifica los campos.');
    }
  };

  return (
    <div className="page">
      <div className="info-card">
        <h3>Nueva Solicitud de Inspección</h3>
        <p>Completa todos los campos del formulario de solicitud.</p>
      </div>

      <div className="info-card">
        <div className="form-section">
          <h4>Datos del responsable</h4>
          <div className="form-grid">
            <label className="form-field">
              <span>Persona responsable del pedido</span>
              <input value={form.responsible_name} onChange={(e) => updateField('responsible_name', e.target.value)} />
            </label>
            <label className="form-field">
              <span>Número de teléfono del responsable</span>
              <input value={form.responsible_phone} onChange={(e) => updateField('responsible_phone', e.target.value)} />
            </label>
            <label className="form-field">
              <span>Mail del responsable</span>
              <input value={form.responsible_email} onChange={(e) => updateField('responsible_email', e.target.value)} />
            </label>
          </div>
        </div>

        <div className="form-section">
          <h4>Datos del propuesto asegurado</h4>
          <div className="form-grid">
            <label className="form-field">
              <span>Nombres</span>
              <input value={form.first_name} onChange={(e) => updateField('first_name', e.target.value)} />
            </label>
            <label className="form-field">
              <span>Apellidos</span>
              <input value={form.last_name} onChange={(e) => updateField('last_name', e.target.value)} />
            </label>
            <label className="form-field">
              <span>Fecha de Nacimiento</span>
              <input type="date" value={form.dob} onChange={(e) => updateField('dob', e.target.value)} />
            </label>
            <label className="form-field">
              <span>Número y tipo de Documento</span>
              <input value={form.id_number} onChange={(e) => updateField('id_number', e.target.value)} />
            </label>
            <label className="form-field">
              <span>Tipo de Documento</span>
              <input value={form.id_type} onChange={(e) => updateField('id_type', e.target.value)} />
            </label>
            <label className="form-field">
              <span>Email</span>
              <input value={form.email} onChange={(e) => updateField('email', e.target.value)} />
            </label>
            <label className="form-field">
              <span>Teléfono Residencial</span>
              <input value={form.phone_home} onChange={(e) => updateField('phone_home', e.target.value)} />
            </label>
            <label className="form-field">
              <span>Teléfono Laboral</span>
              <input value={form.phone_work} onChange={(e) => updateField('phone_work', e.target.value)} />
            </label>
            <label className="form-field">
              <span>Teléfono Celular</span>
              <input value={form.phone_mobile} onChange={(e) => updateField('phone_mobile', e.target.value)} />
            </label>
            <label className="form-field">
              <span>Dirección</span>
              <input value={form.address_line} onChange={(e) => updateField('address_line', e.target.value)} />
            </label>
            <label className="form-field">
              <span>Ciudad</span>
              <input value={form.city} onChange={(e) => updateField('city', e.target.value)} />
            </label>
            <label className="form-field">
              <span>País</span>
              <input value={form.country} onChange={(e) => updateField('country', e.target.value)} />
            </label>
          </div>
        </div>

        <div className="form-section">
          <h4>Datos laborales</h4>
          <div className="form-grid">
            <label className="form-field">
              <span>Nombre de la Empresa / Empleador</span>
              <input value={form.employer_name} onChange={(e) => updateField('employer_name', e.target.value)} />
            </label>
            <label className="form-field">
              <span>CUIT / NIT / RUC de Empresa</span>
              <input value={form.employer_tax_id} onChange={(e) => updateField('employer_tax_id', e.target.value)} />
            </label>
            <label className="form-field">
              <span>Profesión</span>
              <input value={form.profession} onChange={(e) => updateField('profession', e.target.value)} />
            </label>
            <label className="form-field">
              <span>Tareas</span>
              <input value={form.tasks} onChange={(e) => updateField('tasks', e.target.value)} />
            </label>
          </div>
        </div>

        <div className="form-section">
          <h4>Datos de la solicitud</h4>
          <div className="form-grid">
            <label className="form-field">
              <span>Número de Solicitud</span>
              <input value={form.request_number} onChange={(e) => updateField('request_number', e.target.value)} />
            </label>
            <label className="form-field">
              <span>Nombre del Agente</span>
              <input value={form.agent_name} onChange={(e) => updateField('agent_name', e.target.value)} />
            </label>
            <label className="form-field">
              <span>Monto Asegurado (USD)</span>
              <input value={form.insured_amount} onChange={(e) => updateField('insured_amount', e.target.value)} />
            </label>
            <label className="form-field checkbox-field">
              <span>¿Posee Monto en Vigencia?</span>
              <input
                type="checkbox"
                checked={form.has_amount_in_force}
                onChange={(e) => updateField('has_amount_in_force', e.target.checked)}
              />
            </label>
            <label className="form-field">
              <span>Estado Civil</span>
              <input value={form.marital_status} onChange={(e) => updateField('marital_status', e.target.value)} />
            </label>
            <label className="form-field">
              <span>Idioma para la Entrevista</span>
              <input value={form.interview_language} onChange={(e) => updateField('interview_language', e.target.value)} />
            </label>
            <label className="form-field checkbox-field">
              <span>¿El cliente ha sido avisado?</span>
              <input
                type="checkbox"
                checked={form.client_notified}
                onChange={(e) => updateField('client_notified', e.target.checked)}
              />
            </label>
            <label className="form-field">
              <span>Indicaciones / Comentarios</span>
              <textarea value={form.comments} onChange={(e) => updateField('comments', e.target.value)} rows={3} />
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button className="primary-button" onClick={handleSubmit}>
            Crear solicitud
          </button>
          {message && <span className="form-message">{message}</span>}
        </div>
      </div>
    </div>
  );
};

export default NewRequestPage;

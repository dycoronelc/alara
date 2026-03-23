import { useMemo, useState } from 'react';
import { createInspectionRequest } from '../data/api';
import {
  ageInYearsFromDdMmYyyy,
  ddMmYyyyToIso,
  isValidDdMmYyyy,
  normalizeDdMmYyyyInput,
} from '../utils/ddMmYyyyDate';
import { isPanamaCedula, PANAMA_CEDULA_HINT } from '../utils/panamaCedula';

const initialState = {
  responsible_name: '',
  responsible_phone: '',
  responsible_email: '',
  first_name: '',
  last_name: '',
  request_number: '',
  agent_name: '',
  insured_amount: '',
  has_amount_in_force: '',
  amount_in_force: '',
  address_line: '',
  city: '',
  country: '',
  dob: '',
  id_type: '',
  id_number: '',
  employer_name: '',
  profession: '',
  phone_home: '',
  phone_work: '',
  phone_mobile: '',
  email: '',
  marital_status: '',
  comments: '',
  client_notified: '',
  interview_language: '',
};

const NewRequestPage = () => {
  const [form, setForm] = useState(initialState);
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const dobAge = useMemo(() => {
    const v = form.dob.trim();
    if (!v) return null;
    return ageInYearsFromDdMmYyyy(v);
  }, [form.dob]);

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setMessage('');
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!form.responsible_name?.trim()) errors.responsible_name = 'Requerido';
    if (!form.request_number?.trim()) errors.request_number = 'Requerido';
    if (!form.first_name?.trim()) errors.first_name = 'Requerido';
    if (!form.last_name?.trim()) errors.last_name = 'Requerido';
    if (form.amount_in_force && !/^\d+(\.\d+)?$/.test(form.amount_in_force.trim())) {
      errors.amount_in_force = 'Debe ser numérico';
    }
    if (form.id_type === 'CEDULA' && form.id_number?.trim() && !isPanamaCedula(form.id_number)) {
      errors.id_number = 'Formato de cédula de Panamá no válido. ' + PANAMA_CEDULA_HINT;
    }
    if (form.dob.trim() && !isValidDdMmYyyy(form.dob)) {
      errors.dob = 'Use formato dd/mm/aaaa';
    }
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setMessage('Completa los campos obligatorios y corrige los errores.');
      return;
    }

    const payload = {
      request_number: form.request_number,
      agent_name: form.agent_name,
      insured_amount: form.insured_amount ? Number(form.insured_amount) : undefined,
      has_amount_in_force: form.has_amount_in_force === 'Si',
      amount_in_force:
        form.has_amount_in_force === 'Si' && form.amount_in_force.trim()
          ? Number(form.amount_in_force.replace(/,/g, ''))
          : undefined,
      responsible_name: form.responsible_name,
      responsible_phone: form.responsible_phone,
      responsible_email: form.responsible_email,
      marital_status: form.marital_status,
      comments: form.comments.trim() || undefined,
      client_notified:
        form.client_notified === 'Si' ? true : form.client_notified === 'No' ? false : undefined,
      interview_language: form.interview_language,
      client: {
        first_name: form.first_name,
        last_name: form.last_name,
        dob: form.dob.trim() ? ddMmYyyyToIso(form.dob) ?? undefined : undefined,
        id_type: form.id_type || undefined,
        id_number: form.id_number || undefined,
        email: form.email || undefined,
        phone_mobile: form.phone_mobile || undefined,
        phone_home: form.phone_home || undefined,
        phone_work: form.phone_work || undefined,
        address_line: form.address_line || undefined,
        city: form.city || undefined,
        country: form.country || undefined,
        employer_name: form.employer_name || undefined,
        profession: form.profession || undefined,
      },
    };

    try {
      await createInspectionRequest(payload);
      setMessage('');
      setForm(initialState);
      setSuccessModalOpen(true);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string | string[] } } };
      const msg = err.response?.data?.message;
      setMessage(
        Array.isArray(msg) ? msg.join(' ') : typeof msg === 'string' ? msg : 'No se pudo crear la solicitud. Verifica los campos.',
      );
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
            <label className={`form-field ${fieldErrors.responsible_name ? 'has-error' : ''}`}>
              <span>Persona responsable del pedido <span className="field-required" aria-label="obligatorio">*</span></span>
              <input value={form.responsible_name} onChange={(e) => updateField('responsible_name', e.target.value)} />
              {fieldErrors.responsible_name && <span className="field-error">{fieldErrors.responsible_name}</span>}
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
            <label className={`form-field ${fieldErrors.first_name ? 'has-error' : ''}`}>
              <span>Nombres <span className="field-required" aria-label="obligatorio">*</span></span>
              <input value={form.first_name} onChange={(e) => updateField('first_name', e.target.value)} />
              {fieldErrors.first_name && <span className="field-error">{fieldErrors.first_name}</span>}
            </label>
            <label className={`form-field ${fieldErrors.last_name ? 'has-error' : ''}`}>
              <span>Apellidos <span className="field-required" aria-label="obligatorio">*</span></span>
              <input value={form.last_name} onChange={(e) => updateField('last_name', e.target.value)} />
              {fieldErrors.last_name && <span className="field-error">{fieldErrors.last_name}</span>}
            </label>
            <label className={`form-field ${fieldErrors.dob ? 'has-error' : ''}`}>
              <span>Fecha de Nacimiento (dd/mm/aaaa)</span>
              <div className="dob-with-age">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="dd/mm/aaaa"
                  maxLength={10}
                  autoComplete="bday"
                  value={form.dob}
                  onChange={(e) => updateField('dob', normalizeDdMmYyyyInput(e.target.value))}
                  aria-invalid={Boolean(fieldErrors.dob)}
                />
                {dobAge !== null && dobAge >= 0 && (
                  <span className="dob-age-badge" aria-live="polite">
                    Edad: {dobAge} {dobAge === 1 ? 'año' : 'años'}
                  </span>
                )}
                {dobAge !== null && dobAge < 0 && (
                  <span className="dob-age-badge dob-age-badge--warn" aria-live="polite">
                    Fecha futura
                  </span>
                )}
              </div>
              {fieldErrors.dob && <span className="field-error">{fieldErrors.dob}</span>}
            </label>
            <label className="form-field">
              <span>Tipo de Documento</span>
              <select value={form.id_type} onChange={(e) => updateField('id_type', e.target.value)}>
                <option value="">Seleccione...</option>
                <option value="CEDULA">Cédula</option>
                <option value="PASSPORT">Pasaporte</option>
                <option value="OTRO">Otro</option>
              </select>
            </label>
            <label className={`form-field ${fieldErrors.id_number ? 'has-error' : ''}`}>
              <span>Número {form.id_type === 'CEDULA' && <span className="field-required" aria-label="obligatorio">*</span>}</span>
              <input
                value={form.id_number}
                onChange={(e) => updateField('id_number', e.target.value)}
                placeholder={form.id_type === 'CEDULA' ? 'Ej: 1-1234-12345 o E-8-157481' : undefined}
              />
              {form.id_type === 'CEDULA' && (
                <span className="field-error" style={{ color: '#64748b', fontWeight: 'normal', fontSize: '0.75rem' }}>{PANAMA_CEDULA_HINT}</span>
              )}
              {fieldErrors.id_number && <span className="field-error">{fieldErrors.id_number}</span>}
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
              <span>Profesión/Ocupación</span>
              <input value={form.profession} onChange={(e) => updateField('profession', e.target.value)} />
            </label>
          </div>
        </div>

        <div className="form-section">
          <h4>Datos de la solicitud</h4>
          <div className="form-grid">
            <label className={`form-field ${fieldErrors.request_number ? 'has-error' : ''}`}>
              <span>Número de Solicitud <span className="field-required" aria-label="obligatorio">*</span></span>
              <input value={form.request_number} onChange={(e) => updateField('request_number', e.target.value)} />
              {fieldErrors.request_number && <span className="field-error">{fieldErrors.request_number}</span>}
            </label>
            <label className="form-field">
              <span>Nombre del Agente</span>
              <input value={form.agent_name} onChange={(e) => updateField('agent_name', e.target.value)} />
            </label>
            <label className="form-field">
              <span>Monto Asegurado (USD)</span>
              <input value={form.insured_amount} onChange={(e) => updateField('insured_amount', e.target.value)} />
            </label>
            <label className={`form-field ${fieldErrors.has_amount_in_force ? 'has-error' : ''}`}>
              <span>¿Posee Monto en Vigencia?</span>
              <select
                value={form.has_amount_in_force}
                onChange={(e) => updateField('has_amount_in_force', e.target.value)}
              >
                <option value="">Seleccione...</option>
                <option value="Si">Si</option>
                <option value="No">No</option>
              </select>
            </label>
            {form.has_amount_in_force === 'Si' && (
              <label className={`form-field ${fieldErrors.amount_in_force ? 'has-error' : ''}`}>
                <span>¿Cuál es ese monto?</span>
                <input
                  value={form.amount_in_force}
                  onChange={(e) => updateField('amount_in_force', e.target.value.replace(/[^\d.]/g, ''))}
                  inputMode="decimal"
                />
                {fieldErrors.amount_in_force && <span className="field-error">{fieldErrors.amount_in_force}</span>}
              </label>
            )}
            <label className="form-field">
              <span>Estado Civil</span>
              <select value={form.marital_status} onChange={(e) => updateField('marital_status', e.target.value)}>
                <option value="">Seleccione...</option>
                <option value="Soltero">Soltero</option>
                <option value="Casado">Casado</option>
                <option value="Divorciado">Divorciado</option>
                <option value="Viudo">Viudo</option>
                <option value="Unido">Unido</option>
                <option value="Otro">Otro</option>
              </select>
            </label>
            <label className="form-field">
              <span>Idioma para la Entrevista</span>
              <select value={form.interview_language} onChange={(e) => updateField('interview_language', e.target.value)}>
                <option value="">Seleccione...</option>
                <option value="Español">Español</option>
                <option value="Inglés">Inglés</option>
                <option value="Mandarín">Mandarín</option>
                <option value="Portugués">Portugués</option>
                <option value="Francés">Francés</option>
                <option value="Italiano">Italiano</option>
                <option value="Alemán">Alemán</option>
                <option value="Ruso">Ruso</option>
                <option value="Hindi">Hindi</option>
              </select>
            </label>
            <label className="form-field">
              <span>¿El cliente ha sido avisado?</span>
              <select value={form.client_notified} onChange={(e) => updateField('client_notified', e.target.value)}>
                <option value="">Seleccione...</option>
                <option value="Si">Si</option>
                <option value="No">No</option>
              </select>
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

      {successModalOpen && (
        <div
          className="inactivity-overlay system-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-request-success-title"
        >
          <div className="inactivity-modal system-modal">
            <h2 id="new-request-success-title">Éxito</h2>
            <p>Solicitud creada correctamente.</p>
            <button type="button" className="primary-button" onClick={() => setSuccessModalOpen(false)}>
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewRequestPage;

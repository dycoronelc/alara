import { useEffect, useMemo, useState } from 'react';
import {
  createInspectionRequest,
  getInspectionServiceTypes,
  uploadInspectionRequestDocument,
  type InspectionServiceTypeOption,
} from '../data/api';
import {
  ageInYearsFromDdMmYyyy,
  ddMmYyyyToIso,
  ddMmYyyyAndTimeToIso,
  isValidDdMmYyyy,
  normalizeDdMmYyyyInput,
} from '../utils/ddMmYyyyDate';
import { isPanamaCedula, PANAMA_CEDULA_HINT } from '../utils/panamaCedula';

const ATTACHMENT_DOC_OPTIONS = [
  { value: 'CEDULA', label: 'Cédula' },
  { value: 'AUTORIZACION', label: 'Formulario de autorización' },
  { value: 'EVIDENCIA', label: 'Evidencia / soporte' },
  { value: 'OTRO', label: 'Otro' },
] as const;

type AttachmentRow = { key: string; doc_type: string; file: File | null };

const initialState = {
  responsible_name: '',
  responsible_phone: '',
  responsible_email: '',
  service_type_id: '',
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
  interview_date: '',
  interview_time: '',
  interview_language: '',
};

function readResponsibleFromSession(): Partial<typeof initialState> {
  try {
    const raw = localStorage.getItem('alara-user');
    if (!raw) return {};
    const u = JSON.parse(raw) as { full_name?: string; email?: string; phone?: string };
    return {
      responsible_name: u.full_name ?? '',
      responsible_email: u.email ?? '',
      responsible_phone: u.phone ?? '',
    };
  } catch {
    return {};
  }
}

const NewRequestPage = () => {
  const [form, setForm] = useState(() => ({ ...initialState, ...readResponsibleFromSession() }));
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successUploadNote, setSuccessUploadNote] = useState('');
  const [serviceTypes, setServiceTypes] = useState<InspectionServiceTypeOption[]>([]);
  const [serviceTypesLoad, setServiceTypesLoad] = useState<'loading' | 'ok' | 'error'>('loading');
  const [attachments, setAttachments] = useState<AttachmentRow[]>(() => [
    { key: 'att-initial', doc_type: 'CEDULA', file: null },
  ]);

  useEffect(() => {
    setServiceTypesLoad('loading');
    getInspectionServiceTypes()
      .then((rows) => {
        setServiceTypes(Array.isArray(rows) ? rows : []);
        setServiceTypesLoad('ok');
      })
      .catch(() => {
        setServiceTypes([]);
        setServiceTypesLoad('error');
      });
  }, []);

  const dobAge = useMemo(() => {
    const v = form.dob.trim();
    if (!v) return null;
    return ageInYearsFromDdMmYyyy(v);
  }, [form.dob]);

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addAttachmentRow = () => {
    setAttachments((prev) => [
      ...prev,
      { key: `att-${Date.now()}-${Math.random().toString(36).slice(2)}`, doc_type: 'CEDULA', file: null },
    ]);
  };

  const removeAttachmentRow = (key: string) => {
    setAttachments((prev) => prev.filter((r) => r.key !== key));
  };

  const updateAttachmentRow = (key: string, patch: Partial<Pick<AttachmentRow, 'doc_type' | 'file'>>) => {
    setAttachments((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const handleSubmit = async () => {
    setMessage('');
    setFieldErrors({});

    if (serviceTypesLoad === 'loading') {
      setMessage('Espera a que carguen los tipos de servicio.');
      return;
    }
    if (serviceTypesLoad === 'error' || (serviceTypesLoad === 'ok' && serviceTypes.length === 0)) {
      setMessage(
        'No hay tipos de servicio disponibles. Comprueba la conexión, recarga la página o contacta al administrador (migración SQL / base de datos).',
      );
      return;
    }

    const t = (v: string) => v?.trim() ?? '';
    const errors: Record<string, string> = {};

    if (!t(form.responsible_name)) errors.responsible_name = 'Requerido';
    if (!t(form.responsible_phone)) errors.responsible_phone = 'Requerido';
    if (!t(form.responsible_email)) errors.responsible_email = 'Requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t(form.responsible_email))) {
      errors.responsible_email = 'Correo no válido';
    }

    const serviceTypeNum = Number(form.service_type_id);
    if (!form.service_type_id || Number.isNaN(serviceTypeNum) || serviceTypeNum < 1) {
      errors.service_type_id = 'Requerido';
    }

    if (!t(form.first_name)) errors.first_name = 'Requerido';
    if (!t(form.last_name)) errors.last_name = 'Requerido';
    if (!t(form.dob)) errors.dob = 'Requerido';
    else if (!isValidDdMmYyyy(form.dob)) errors.dob = 'Use formato dd/mm/aaaa';

    if (!form.id_type) errors.id_type = 'Requerido';
    if (!t(form.id_number)) errors.id_number = 'Requerido';
    else if (form.id_type === 'CEDULA' && !isPanamaCedula(form.id_number)) {
      errors.id_number = 'Formato de cédula de Panamá no válido. ' + PANAMA_CEDULA_HINT;
    }

    if (!t(form.email)) errors.email = 'Requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t(form.email))) errors.email = 'Correo no válido';

    if (!t(form.phone_home)) errors.phone_home = 'Requerido';
    if (!t(form.phone_work)) errors.phone_work = 'Requerido';
    if (!t(form.phone_mobile)) errors.phone_mobile = 'Requerido';
    if (!t(form.address_line)) errors.address_line = 'Requerido';
    if (!t(form.city)) errors.city = 'Requerido';
    if (!t(form.country)) errors.country = 'Requerido';

    if (!t(form.employer_name)) errors.employer_name = 'Requerido';
    if (!t(form.profession)) errors.profession = 'Requerido';

    if (!t(form.request_number)) errors.request_number = 'Requerido';
    if (!t(form.agent_name)) errors.agent_name = 'Requerido';

    if (!t(form.insured_amount)) errors.insured_amount = 'Requerido';
    else if (Number.isNaN(Number(form.insured_amount.replace(/,/g, '')))) {
      errors.insured_amount = 'Debe ser numérico';
    }

    if (!form.has_amount_in_force) errors.has_amount_in_force = 'Requerido';
    if (form.has_amount_in_force === 'Si') {
      if (!t(form.amount_in_force)) errors.amount_in_force = 'Requerido';
      else if (!/^\d+(\.\d+)?$/.test(form.amount_in_force.trim())) {
        errors.amount_in_force = 'Debe ser numérico';
      }
    }

    if (!form.marital_status) errors.marital_status = 'Requerido';
    if (!form.interview_language) errors.interview_language = 'Requerido';
    if (!form.client_notified) errors.client_notified = 'Requerido';
    if (form.client_notified === 'Si') {
      if (!t(form.interview_date)) errors.interview_date = 'Requerido';
      else if (!isValidDdMmYyyy(form.interview_date)) errors.interview_date = 'Use formato dd/mm/aaaa';
      if (!t(form.interview_time)) errors.interview_time = 'Requerido';
    }
    if (!t(form.comments)) errors.comments = 'Requerido';

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setMessage('Completa los campos obligatorios y corrige los errores.');
      return;
    }

    const isoDob = ddMmYyyyToIso(form.dob);
    if (!isoDob) {
      setFieldErrors({ dob: 'Fecha inválida' });
      setMessage('Revisa la fecha de nacimiento.');
      return;
    }

    const notified = form.client_notified === 'Si';
    const interviewStartIso =
      notified && t(form.interview_date) && t(form.interview_time)
        ? ddMmYyyyAndTimeToIso(form.interview_date, form.interview_time) ?? undefined
        : undefined;
    const interviewEndIso =
      interviewStartIso != null
        ? new Date(new Date(interviewStartIso).getTime() + 60 * 60 * 1000).toISOString()
        : undefined;

    const payload = {
      service_type_id: serviceTypeNum,
      request_number: t(form.request_number),
      agent_name: t(form.agent_name),
      insured_amount: Number(String(form.insured_amount).replace(/,/g, '')),
      has_amount_in_force: form.has_amount_in_force === 'Si',
      amount_in_force:
        form.has_amount_in_force === 'Si' && t(form.amount_in_force)
          ? Number(form.amount_in_force.replace(/,/g, ''))
          : undefined,
      responsible_name: t(form.responsible_name),
      responsible_phone: t(form.responsible_phone),
      responsible_email: t(form.responsible_email),
      marital_status: form.marital_status,
      comments: t(form.comments),
      client_notified: notified,
      ...(interviewStartIso != null
        ? { scheduled_start_at: interviewStartIso, scheduled_end_at: interviewEndIso }
        : {}),
      interview_language: form.interview_language,
      client: {
        first_name: t(form.first_name),
        last_name: t(form.last_name),
        dob: isoDob,
        id_type: form.id_type as 'CEDULA' | 'PASSPORT' | 'OTRO',
        id_number: t(form.id_number),
        email: t(form.email),
        phone_mobile: t(form.phone_mobile),
        phone_home: t(form.phone_home),
        phone_work: t(form.phone_work),
        address_line: t(form.address_line),
        city: t(form.city),
        country: t(form.country),
        employer_name: t(form.employer_name),
        profession: t(form.profession),
      },
    };

    try {
      const created = await createInspectionRequest(payload);
      const rid = Number(created.id);
      if (!Number.isFinite(rid) || rid <= 0) {
        throw new Error('Respuesta inválida del servidor');
      }

      const toUpload = attachments.filter((a) => a.file);
      const failedNames: string[] = [];
      for (const row of toUpload) {
        try {
          await uploadInspectionRequestDocument(rid, row.file!, row.doc_type);
        } catch {
          failedNames.push(row.file!.name);
        }
      }

      setMessage('');
      setSuccessUploadNote(
        failedNames.length
          ? `La solicitud fue creada, pero no se pudieron subir: ${failedNames.join(', ')}.`
          : '',
      );
      setAttachments([{ key: `att-${Date.now()}`, doc_type: 'CEDULA', file: null }]);
      setForm({ ...initialState, ...readResponsibleFromSession() });
      setSuccessModalOpen(true);
    } catch {
      setMessage('No se pudo crear la solicitud. Verifica los campos o tu sesión.');
    }
  };

  const reqStar = <span className="field-required" aria-label="obligatorio">*</span>;

  return (
    <div className="page new-request-page">
      <div className="info-card new-request-card">
        <h3>Nueva Solicitud de Inspección</h3>
        <p>
          Todos los campos son obligatorios salvo los adjuntos. Los datos del responsable se cargan desde tu usuario.
        </p>
        <div className="form-section">
          <h4>Datos del responsable</h4>
          <div className="form-grid">
            <label className={`form-field ${fieldErrors.responsible_name ? 'has-error' : ''}`}>
              <span>Persona responsable del pedido {reqStar}</span>
              <input value={form.responsible_name} onChange={(e) => updateField('responsible_name', e.target.value)} />
              {fieldErrors.responsible_name && <span className="field-error">{fieldErrors.responsible_name}</span>}
            </label>
            <label className={`form-field ${fieldErrors.responsible_phone ? 'has-error' : ''}`}>
              <span>Número de teléfono del responsable {reqStar}</span>
              <input value={form.responsible_phone} onChange={(e) => updateField('responsible_phone', e.target.value)} />
              {fieldErrors.responsible_phone && <span className="field-error">{fieldErrors.responsible_phone}</span>}
            </label>
            <label className={`form-field ${fieldErrors.responsible_email ? 'has-error' : ''}`}>
              <span>Mail del responsable {reqStar}</span>
              <input
                type="email"
                autoComplete="email"
                value={form.responsible_email}
                onChange={(e) => updateField('responsible_email', e.target.value)}
              />
              {fieldErrors.responsible_email && <span className="field-error">{fieldErrors.responsible_email}</span>}
            </label>
          </div>
        </div>

        <div className="form-section">
          <h4>Tipo de servicio</h4>
          <div className="form-grid">
            <label className={`form-field ${fieldErrors.service_type_id ? 'has-error' : ''}`}>
              <span>Tipo de servicio {reqStar}</span>
              <select
                value={form.service_type_id}
                onChange={(e) => updateField('service_type_id', e.target.value)}
                disabled={serviceTypesLoad === 'loading' || serviceTypesLoad === 'error'}
              >
                <option value="">
                  {serviceTypesLoad === 'loading' ? 'Cargando tipos…' : 'Seleccione...'}
                </option>
                {serviceTypes.map((st) => (
                  <option key={st.id} value={String(st.id)}>
                    {st.name}
                  </option>
                ))}
              </select>
              {serviceTypesLoad === 'error' && (
                <span className="field-error">No se pudieron cargar los tipos. Recarga la página.</span>
              )}
              {serviceTypesLoad === 'ok' && serviceTypes.length === 0 && (
                <span className="field-error">No hay tipos configurados en el sistema.</span>
              )}
              {fieldErrors.service_type_id && <span className="field-error">{fieldErrors.service_type_id}</span>}
            </label>
          </div>
        </div>
      </div>

      <div className="info-card">
        <div className="form-section">
          <h4>Datos del propuesto asegurado</h4>
          <div className="form-grid">
            <label className={`form-field ${fieldErrors.first_name ? 'has-error' : ''}`}>
              <span>Nombres {reqStar}</span>
              <input value={form.first_name} onChange={(e) => updateField('first_name', e.target.value)} />
              {fieldErrors.first_name && <span className="field-error">{fieldErrors.first_name}</span>}
            </label>
            <label className={`form-field ${fieldErrors.last_name ? 'has-error' : ''}`}>
              <span>Apellidos {reqStar}</span>
              <input value={form.last_name} onChange={(e) => updateField('last_name', e.target.value)} />
              {fieldErrors.last_name && <span className="field-error">{fieldErrors.last_name}</span>}
            </label>
            <label className={`form-field ${fieldErrors.dob ? 'has-error' : ''}`}>
              <span>Fecha de Nacimiento (dd/mm/aaaa) {reqStar}</span>
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
            <label className={`form-field ${fieldErrors.id_type ? 'has-error' : ''}`}>
              <span>Tipo de Documento {reqStar}</span>
              <select value={form.id_type} onChange={(e) => updateField('id_type', e.target.value)}>
                <option value="">Seleccione...</option>
                <option value="CEDULA">Cédula</option>
                <option value="PASSPORT">Pasaporte</option>
                <option value="OTRO">Otro</option>
              </select>
              {fieldErrors.id_type && <span className="field-error">{fieldErrors.id_type}</span>}
            </label>
            <label className={`form-field ${fieldErrors.id_number ? 'has-error' : ''}`}>
              <span>Número {reqStar}</span>
              <input
                value={form.id_number}
                onChange={(e) => updateField('id_number', e.target.value)}
                placeholder={form.id_type === 'CEDULA' ? 'Ej: 1-1234-12345 o E-8-157481' : undefined}
              />
              {form.id_type === 'CEDULA' && (
                <span className="field-error" style={{ color: '#64748b', fontWeight: 'normal', fontSize: '0.75rem' }}>
                  {PANAMA_CEDULA_HINT}
                </span>
              )}
              {fieldErrors.id_number && <span className="field-error">{fieldErrors.id_number}</span>}
            </label>
            <label className={`form-field ${fieldErrors.email ? 'has-error' : ''}`}>
              <span>Email {reqStar}</span>
              <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
              {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
            </label>
            <label className={`form-field ${fieldErrors.phone_home ? 'has-error' : ''}`}>
              <span>Teléfono Residencial {reqStar}</span>
              <input value={form.phone_home} onChange={(e) => updateField('phone_home', e.target.value)} />
              {fieldErrors.phone_home && <span className="field-error">{fieldErrors.phone_home}</span>}
            </label>
            <label className={`form-field ${fieldErrors.phone_work ? 'has-error' : ''}`}>
              <span>Teléfono Laboral {reqStar}</span>
              <input value={form.phone_work} onChange={(e) => updateField('phone_work', e.target.value)} />
              {fieldErrors.phone_work && <span className="field-error">{fieldErrors.phone_work}</span>}
            </label>
            <label className={`form-field ${fieldErrors.phone_mobile ? 'has-error' : ''}`}>
              <span>Teléfono Celular {reqStar}</span>
              <input value={form.phone_mobile} onChange={(e) => updateField('phone_mobile', e.target.value)} />
              {fieldErrors.phone_mobile && <span className="field-error">{fieldErrors.phone_mobile}</span>}
            </label>
            <label className={`form-field ${fieldErrors.address_line ? 'has-error' : ''}`}>
              <span>Dirección {reqStar}</span>
              <input value={form.address_line} onChange={(e) => updateField('address_line', e.target.value)} />
              {fieldErrors.address_line && <span className="field-error">{fieldErrors.address_line}</span>}
            </label>
            <label className={`form-field ${fieldErrors.city ? 'has-error' : ''}`}>
              <span>Ciudad {reqStar}</span>
              <input value={form.city} onChange={(e) => updateField('city', e.target.value)} />
              {fieldErrors.city && <span className="field-error">{fieldErrors.city}</span>}
            </label>
            <label className={`form-field ${fieldErrors.country ? 'has-error' : ''}`}>
              <span>País {reqStar}</span>
              <input value={form.country} onChange={(e) => updateField('country', e.target.value)} />
              {fieldErrors.country && <span className="field-error">{fieldErrors.country}</span>}
            </label>
          </div>
        </div>

        <div className="form-section">
          <h4>Datos laborales</h4>
          <div className="form-grid">
            <label className={`form-field ${fieldErrors.employer_name ? 'has-error' : ''}`}>
              <span>Nombre de la Empresa / Empleador {reqStar}</span>
              <input value={form.employer_name} onChange={(e) => updateField('employer_name', e.target.value)} />
              {fieldErrors.employer_name && <span className="field-error">{fieldErrors.employer_name}</span>}
            </label>
            <label className={`form-field ${fieldErrors.profession ? 'has-error' : ''}`}>
              <span>Profesión/Ocupación {reqStar}</span>
              <input value={form.profession} onChange={(e) => updateField('profession', e.target.value)} />
              {fieldErrors.profession && <span className="field-error">{fieldErrors.profession}</span>}
            </label>
          </div>
        </div>
      </div>

      <div className="info-card">
        <div className="form-section">
          <h4>Datos de la solicitud</h4>
          <div className="form-grid">
            <label className={`form-field ${fieldErrors.request_number ? 'has-error' : ''}`}>
              <span>Número de Solicitud {reqStar}</span>
              <input value={form.request_number} onChange={(e) => updateField('request_number', e.target.value)} />
              {fieldErrors.request_number && <span className="field-error">{fieldErrors.request_number}</span>}
            </label>
            <label className={`form-field ${fieldErrors.agent_name ? 'has-error' : ''}`}>
              <span>Nombre del Agente {reqStar}</span>
              <input value={form.agent_name} onChange={(e) => updateField('agent_name', e.target.value)} />
              {fieldErrors.agent_name && <span className="field-error">{fieldErrors.agent_name}</span>}
            </label>
            <label className={`form-field ${fieldErrors.insured_amount ? 'has-error' : ''}`}>
              <span>Monto Asegurado (USD) {reqStar}</span>
              <input value={form.insured_amount} onChange={(e) => updateField('insured_amount', e.target.value)} />
              {fieldErrors.insured_amount && <span className="field-error">{fieldErrors.insured_amount}</span>}
            </label>
            <label className={`form-field ${fieldErrors.has_amount_in_force ? 'has-error' : ''}`}>
              <span>¿Posee Monto en Vigencia? {reqStar}</span>
              <select
                value={form.has_amount_in_force}
                onChange={(e) => updateField('has_amount_in_force', e.target.value)}
              >
                <option value="">Seleccione...</option>
                <option value="Si">Si</option>
                <option value="No">No</option>
              </select>
              {fieldErrors.has_amount_in_force && <span className="field-error">{fieldErrors.has_amount_in_force}</span>}
            </label>
            {form.has_amount_in_force === 'Si' && (
              <label className={`form-field ${fieldErrors.amount_in_force ? 'has-error' : ''}`}>
                <span>¿Cuál es ese monto? {reqStar}</span>
                <input
                  value={form.amount_in_force}
                  onChange={(e) => updateField('amount_in_force', e.target.value.replace(/[^\d.]/g, ''))}
                  inputMode="decimal"
                />
                {fieldErrors.amount_in_force && <span className="field-error">{fieldErrors.amount_in_force}</span>}
              </label>
            )}
            <label className={`form-field ${fieldErrors.marital_status ? 'has-error' : ''}`}>
              <span>Estado Civil {reqStar}</span>
              <select value={form.marital_status} onChange={(e) => updateField('marital_status', e.target.value)}>
                <option value="">Seleccione...</option>
                <option value="Soltero">Soltero</option>
                <option value="Casado">Casado</option>
                <option value="Divorciado">Divorciado</option>
                <option value="Viudo">Viudo</option>
                <option value="Unido">Unido</option>
                <option value="Otro">Otro</option>
              </select>
              {fieldErrors.marital_status && <span className="field-error">{fieldErrors.marital_status}</span>}
            </label>
            <label className={`form-field ${fieldErrors.interview_language ? 'has-error' : ''}`}>
              <span>Idioma para la Entrevista {reqStar}</span>
              <select value={form.interview_language} onChange={(e) => updateField('interview_language', e.target.value)}>
                <option value="">Seleccione...</option>
                <option value="Español">Español</option>
                <option value="Inglés">Inglés</option>
                <option value="Chino">Chino</option>
                <option value="Mandarín">Mandarín</option>
                <option value="Portugués">Portugués</option>
                <option value="Francés">Francés</option>
                <option value="Italiano">Italiano</option>
                <option value="Alemán">Alemán</option>
                <option value="Ruso">Ruso</option>
                <option value="Hindi">Hindi</option>
              </select>
              {fieldErrors.interview_language && <span className="field-error">{fieldErrors.interview_language}</span>}
            </label>
            <label className={`form-field ${fieldErrors.client_notified ? 'has-error' : ''}`}>
              <span>¿El cliente ha sido avisado? {reqStar}</span>
              <select
                value={form.client_notified}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    client_notified: v,
                    ...(v !== 'Si' ? { interview_date: '', interview_time: '' } : {}),
                  }));
                }}
              >
                <option value="">Seleccione...</option>
                <option value="Si">Si</option>
                <option value="No">No</option>
              </select>
              {fieldErrors.client_notified && <span className="field-error">{fieldErrors.client_notified}</span>}
            </label>
            {form.client_notified === 'Si' && (
              <>
                <label className={`form-field ${fieldErrors.interview_date ? 'has-error' : ''}`}>
                  <span>Fecha de la entrevista (dd/mm/aaaa) {reqStar}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="dd/mm/aaaa"
                    maxLength={10}
                    value={form.interview_date}
                    onChange={(e) => updateField('interview_date', normalizeDdMmYyyyInput(e.target.value))}
                    aria-invalid={Boolean(fieldErrors.interview_date)}
                  />
                  {fieldErrors.interview_date && (
                    <span className="field-error">{fieldErrors.interview_date}</span>
                  )}
                </label>
                <label className={`form-field ${fieldErrors.interview_time ? 'has-error' : ''}`}>
                  <span>Hora de la entrevista {reqStar}</span>
                  <input
                    type="time"
                    value={form.interview_time}
                    onChange={(e) => updateField('interview_time', e.target.value)}
                  />
                  {fieldErrors.interview_time && (
                    <span className="field-error">{fieldErrors.interview_time}</span>
                  )}
                </label>
              </>
            )}
            <label className={`form-field ${fieldErrors.comments ? 'has-error' : ''}`}>
              <span>Indicaciones / Comentarios {reqStar}</span>
              <textarea value={form.comments} onChange={(e) => updateField('comments', e.target.value)} rows={3} />
              {fieldErrors.comments && <span className="field-error">{fieldErrors.comments}</span>}
            </label>
          </div>
        </div>

        <div className="form-section">
          <h4>Documentos adjuntos</h4>
          <p className="form-hint">
            Opcional. Puedes adjuntar por ejemplo cédula, formulario de autorización u otros documentos. Formatos:
            PDF o imagen (JPEG, PNG, WebP), hasta 10 MB por archivo.
          </p>
          {attachments.map((row) => (
            <div key={row.key} className="attachment-row">
              <div className="form-grid attachment-row__grid">
                <label className="form-field">
                  <span>Tipo de documento</span>
                  <select
                    value={row.doc_type}
                    onChange={(e) => updateAttachmentRow(row.key, { doc_type: e.target.value })}
                  >
                    {ATTACHMENT_DOC_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Archivo</span>
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      updateAttachmentRow(row.key, { file: f });
                    }}
                  />
                </label>
              </div>
              <button type="button" className="ghost-button attachment-row__remove" onClick={() => removeAttachmentRow(row.key)}>
                Quitar
              </button>
            </div>
          ))}
          <button type="button" className="ghost-button" onClick={addAttachmentRow}>
            Añadir documento
          </button>
        </div>

        <div className="form-actions">
          <button type="button" className="primary-button" onClick={handleSubmit}>
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
            {successUploadNote ? <p className="form-message">{successUploadNote}</p> : null}
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                setSuccessModalOpen(false);
                setSuccessUploadNote('');
              }}
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewRequestPage;

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  downloadPdf,
  getInspectionRequest,
  getInvestigations,
  saveInspectionReport,
  shareInspectionReport,
  startInspectionCall,
  triggerInvestigation,
  updateInspectionRequestClient,
  type UpdateClientPayload,
} from '../data/api';
import StatusBadge from '../components/StatusBadge';

type RequestDetailProps = {
  portal: 'aseguradora' | 'alara';
};

type ClientInfo = {
  first_name?: string;
  last_name?: string;
  dob?: string;
  id_type?: string;
  id_number?: string;
  email?: string;
  phone_mobile?: string;
  phone_home?: string;
  phone_work?: string;
  address_line?: string;
  city?: string;
  country?: string;
  employer_name?: string;
  employer_tax_id?: string;
  profession?: string;
  tasks?: string;
  marital_status?: string;
};

type RequestDetail = {
  id: number;
  request_number: string;
  status: string;
  responsible_name: string;
  responsible_phone?: string;
  responsible_email?: string;
  agent_name?: string;
  insured_amount?: string | number;
  has_amount_in_force?: boolean;
  marital_status?: string;
  interview_language?: string;
  priority?: string;
  comments?: string;
  client_notified?: boolean;
  scheduled_start_at?: string;
  scheduled_end_at?: string;
  completed_at?: string;
  report_shared_at?: string;
  created_at?: string;
  insurer?: { name?: string };
  client?: ClientInfo;
  inspection_report?: {
    summary?: string | null;
    additional_comments?: string | null;
    outcome?: string | null;
    sections?: { section_title: string; fields: { field_key: string; field_value?: string | null }[] }[];
  } | null;
  report_template?: {
    code: string;
    updated_at?: string | null;
    created_at?: string | null;
    payload?: { sections?: { code?: string; title: string; fields: any[] }[] };
  } | null;
};

type FieldDef = { key: string; label: string; type?: 'text' | 'textarea' };
type SectionDef = { code?: string; title: string; fields: FieldDef[] };

const buildReportSections = (): SectionDef[] => [
  {
    title: 'Datos personales',
    fields: [
      { key: 'pa_name', label: 'Propuesto Asegurado' },
      { key: 'home_address', label: 'Domicilio Particular' },
      { key: 'residence_time', label: 'Tiempo de Residencia' },
      { key: 'foreign_residence', label: 'Residencia en el extranjero (Dónde / cuándo)', type: 'textarea' },
      { key: 'mobile', label: 'Celular' },
      { key: 'email', label: 'E-mail' },
      { key: 'dob', label: 'Fecha de Nacimiento' },
      { key: 'document', label: 'Tipo y No. Documento' },
      { key: 'nationality', label: 'Nacionalidad' },
      { key: 'marital_status', label: 'Estado Civil' },
      { key: 'spouse_name', label: 'Nombre del Cónyuge' },
      { key: 'children', label: 'Hijos' },
    ],
  },
  {
    title: 'Profesión – Actividad Laboral',
    fields: [
      { key: 'profession_studies', label: 'Profesión / Estudios Cursados' },
      { key: 'occupation', label: 'Ocupación / Cargo' },
      { key: 'functions', label: 'Funciones', type: 'textarea' },
      { key: 'employer', label: 'Empleador / Empresa' },
      { key: 'seniority', label: 'Antigüedad en la empresa' },
      { key: 'company_start', label: 'Fecha de Creación de la Empresa' },
      { key: 'employees', label: 'Cantidad de Empleados' },
      { key: 'employee_or_partner', label: '¿Es empleado o socio?' },
      { key: 'business_nature', label: 'Naturaleza del Negocio' },
      { key: 'clients', label: 'Clientes' },
      { key: 'business_address', label: 'Domicilio Comercial' },
      { key: 'website', label: 'Sitio Web' },
      { key: 'other_occupation', label: 'Otra Ocupación Actual (describa)', type: 'textarea' },
    ],
  },
  {
    title: 'Salud',
    fields: [
      { key: 'doctor_name', label: 'Nombre del Médico Personal' },
      { key: 'medical_coverage', label: 'Cobertura Médica' },
      { key: 'last_consult', label: 'Fecha Última Consulta Médica' },
      { key: 'last_checkup', label: 'Fecha Último Check-up' },
      { key: 'doctor_contact', label: 'Nombre, Dirección del Médico Consultado' },
      { key: 'studies', label: 'Estudios realizados', type: 'textarea' },
      { key: 'results', label: 'Resultados Obtenidos', type: 'textarea' },
      { key: 'weight', label: 'Peso' },
      { key: 'height', label: 'Altura' },
      { key: 'weight_change', label: 'Cambio de Peso' },
      { key: 'deafness', label: 'Sordera' },
      { key: 'blindness', label: 'Ceguera' },
      { key: 'physical_alterations', label: 'Alteraciones Físicas' },
      { key: 'amputations', label: 'Amputaciones' },
      { key: 'other_impediments', label: 'Otros Impedimentos' },
      { key: 'high_pressure', label: 'Alta Presión' },
      { key: 'diabetes', label: 'Diabetes' },
      { key: 'cancer', label: 'Cáncer' },
      { key: 'cardiac', label: 'Problemas Cardiacos' },
      { key: 'ulcer', label: 'Úlcera' },
      { key: 'surgeries', label: 'Cirugías / Fechas', type: 'textarea' },
      { key: 'important_diseases', label: 'Enfermedades Importantes / Fechas', type: 'textarea' },
      { key: 'prescribed_meds', label: 'Medicamentos con prescripción (Nombre y Dosis)', type: 'textarea' },
      { key: 'non_prescribed_meds', label: 'Medicamentos no recetados (Nombre y Dosis)', type: 'textarea' },
    ],
  },
  {
    title: 'Factores de riesgo en sus labores',
    fields: [
      { key: 'work_risk', label: '¿Está expuesto a algún riesgo por sus labores?' },
      { key: 'work_risk_desc', label: 'Descripción según Ocupación', type: 'textarea' },
      { key: 'safety_rules', label: '¿Hay Normas de Seguridad?' },
    ],
  },
  {
    title: 'Viajes',
    fields: [
      { key: 'travel_destination', label: 'Destino' },
      { key: 'travel_transport', label: 'Medio' },
      { key: 'travel_reason', label: 'Motivo' },
      { key: 'travel_frequency', label: 'Frecuencia' },
    ],
  },
  {
    title: 'Deportes de Riesgo',
    fields: [
      { key: 'diving', label: '¿Buceo?' },
      { key: 'racing', label: '¿Carrera de Vehículos?' },
      { key: 'pilot', label: '¿Piloto de avión o Piloto Estudiante?' },
      { key: 'ultralight', label: 'Aviones Ultraligeros' },
      { key: 'parachute', label: 'Paracaidismo' },
      { key: 'paragliding', label: 'Parapente' },
      { key: 'climbing', label: 'Escalamiento de montañas' },
      { key: 'other_risk', label: 'Otra Actividad de Riesgo (ampliar)', type: 'textarea' },
      { key: 'accidents', label: 'Accidentes o lesiones (detallar)', type: 'textarea' },
    ],
  },
  {
    title: 'Deportes',
    fields: [
      { key: 'sports_activity', label: 'Deporte o Actividad Física' },
      { key: 'sports_frequency', label: 'Frecuencia' },
      { key: 'sports_details', label: 'Detalles', type: 'textarea' },
    ],
  },
  {
    title: 'Tabaco',
    fields: [
      { key: 'smoker', label: '¿Es Fumador o utiliza algún tipo de tabaco?' },
      { key: 'tobacco_type', label: 'Tipo de Tabaco' },
      { key: 'tobacco_amount', label: 'Cantidad y Frecuencia de Consumo' },
      { key: 'tobacco_period', label: 'Período de Consumo' },
      { key: 'tobacco_last', label: 'Fecha del Último consumo' },
      { key: 'vape', label: '¿Consume cigarrillo electrónico?' },
      { key: 'vape_details', label: 'Cantidad/frecuencia y circunstancias', type: 'textarea' },
    ],
  },
  {
    title: 'Alcohol – Drogas',
    fields: [
      { key: 'alcohol', label: '¿Toma Bebidas Alcohólicas?' },
      { key: 'marijuana', label: 'Marihuana' },
      { key: 'amphetamines', label: 'Anfetaminas' },
      { key: 'barbiturics', label: 'Barbitúricos' },
      { key: 'cocaine', label: 'Cocaína' },
      { key: 'lsd', label: 'LSD' },
      { key: 'stimulants', label: 'Estimulantes' },
      { key: 'other_drugs', label: 'Otras Drogas' },
      { key: 'treatment', label: 'Tratamiento por Consumo de Drogas / Alcohol', type: 'textarea' },
    ],
  },
  {
    title: 'Política',
    fields: [
      { key: 'pep', label: '¿Es PEP? (detallar)', type: 'textarea' },
      { key: 'political_party', label: '¿Participa en partido político? (detallar)', type: 'textarea' },
    ],
  },
  {
    title: 'Seguridad',
    fields: [
      { key: 'kidnapping', label: '¿Ha sido Secuestrado o Recibido Amenazas?' },
      { key: 'armored_car', label: 'Auto Blindado' },
      { key: 'weapons', label: 'Portación / Tenencia de Armas' },
      { key: 'weapon_time', label: '¿Hace cuánto tiempo las utiliza?' },
      { key: 'weapon_use', label: '¿En qué circunstancia la porta?' },
      { key: 'weapon_reason', label: 'Razón de portación' },
      { key: 'weapon_type', label: 'Tipo de arma, calibre y modelo' },
      { key: 'weapon_fired', label: '¿Utilizó o disparó el arma?' },
      { key: 'weapon_training', label: 'Entrenamiento especial (nombre y lugar)', type: 'textarea' },
      { key: 'military', label: '¿Ha pertenecido a fuerza militar/política? (detallar)', type: 'textarea' },
      { key: 'weapon_maintenance', label: 'Frecuencia de mantenimiento del arma' },
      { key: 'practice_place', label: 'Lugar de práctica' },
      { key: 'security_equipment', label: 'Equipo de seguridad utilizado' },
      { key: 'accidents_security', label: '¿Ha tenido accidentes?' },
      { key: 'personal_guard', label: 'Custodia Personal' },
    ],
  },
  {
    title: 'Historia de Seguros',
    fields: [
      { key: 'insurance_date', label: 'Fecha' },
      { key: 'insurance_company', label: 'Compañía' },
      { key: 'insurance_amount', label: 'Monto' },
      { key: 'insurance_reason', label: 'Motivo del seguro', type: 'textarea' },
      { key: 'simultaneous_policy', label: 'Seguro de vida en otra compañía (detallar)', type: 'textarea' },
    ],
  },
  {
    title: 'Detalle del seguro',
    fields: [
      { key: 'insurance_object', label: 'Objeto del seguro' },
      { key: 'policy_holder', label: 'Tomador de la Póliza' },
      { key: 'policy_payer', label: 'Pagador de la Póliza' },
      { key: 'bank_name', label: 'Banco de origen de fondos' },
      { key: 'funds_origin', label: 'Origen de fondos', type: 'textarea' },
      { key: 'previous_rejected', label: '¿Solicitud rechazada anteriormente?' },
      { key: 'replaces_policy', label: '¿Reemplaza póliza actual?' },
    ],
  },
  {
    title: 'Ingresos',
    fields: [
      { key: 'earned_income', label: 'Ingreso Ganado Anual' },
      { key: 'earned_concept', label: 'Concepto (Sueldo, Comisiones, etc.)', type: 'textarea' },
      { key: 'unearned_income', label: 'Ingresos Anuales No Ganados' },
      { key: 'unearned_concept', label: 'Concepto (Dividendos, etc.)', type: 'textarea' },
      { key: 'total_income', label: 'Ingreso Total Anual' },
    ],
  },
  {
    title: 'Activo Personal',
    fields: [
      { key: 'total_assets', label: 'Total Activo Personal' },
      { key: 'real_estate', label: 'Inmuebles / Bienes Raíces' },
      { key: 'cash_bank', label: 'Efectivo en banco' },
      { key: 'goods', label: 'Bienes (vehículos, arte, etc.)', type: 'textarea' },
      { key: 'society', label: 'Participación en Sociedades' },
      { key: 'stocks', label: 'Acciones y Bonos' },
      { key: 'other_assets', label: 'Otros Activos (Detalles)', type: 'textarea' },
      { key: 'receivables', label: 'Cuentas por Cobrar' },
    ],
  },
  {
    title: 'Pasivo Personal',
    fields: [
      { key: 'total_liabilities', label: 'Total Pasivo Personal' },
    ],
  },
  {
    title: 'Finanzas – Otros',
    fields: [
      { key: 'banks', label: 'Bancos con los cuales opera' },
      { key: 'bank_relationship', label: 'Antigüedad' },
      { key: 'credit_cards', label: 'Tarjetas de crédito' },
      { key: 'bankruptcy', label: '¿Está en Quiebra Comercial?' },
      { key: 'negative_history', label: 'Antecedentes comerciales negativos', type: 'textarea' },
    ],
  },
  {
    title: 'Historial de Manejo',
    fields: [
      { key: 'dui', label: 'Condenas por DUI en últimos 5 años', type: 'textarea' },
      { key: 'traffic', label: 'Infracciones de tránsito últimos 3 años', type: 'textarea' },
    ],
  },
  {
    title: 'Juicios',
    fields: [
      { key: 'criminal_case', label: 'Juicio Penal' },
      { key: 'civil_case', label: 'Juicio Civil' },
      { key: 'commercial_case', label: 'Juicio Comercial' },
      { key: 'labor_case', label: 'Juicio Laboral' },
      { key: 'arrested', label: '¿Ha sido Arrestado? Detallar', type: 'textarea' },
    ],
  },
  {
    title: 'Ampliación o Comentarios Adicional',
    fields: [{ key: 'additional_comments', label: 'Comentarios', type: 'textarea' }],
  },
];

const RequestDetailPage = ({ portal }: RequestDetailProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<RequestDetail | null>(null);
  const [activeTab, setActiveTab] = useState<
    'general' | 'cliente' | 'solicitud' | 'reporte' | 'documentacion' | 'investigaciones'
  >('general');
  const [showReportForm] = useState(true);
  const [reportValues, setReportValues] = useState<Record<string, string>>({});
  const [reportSummary, setReportSummary] = useState('');
  const [reportComments, setReportComments] = useState('');
  const [reportOutcome, setReportOutcome] = useState<'PENDIENTE' | 'FAVORABLE' | 'NO_FAVORABLE' | 'INCONCLUSO'>(
    'PENDIENTE',
  );
  const [reportMessage, setReportMessage] = useState('');
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [documents, setDocuments] = useState<File[]>([]);
  const [investigationMessage, setInvestigationMessage] = useState('');
  const [callMessage, setCallMessage] = useState('');
  const [editingClient, setEditingClient] = useState(false);
  const [clientForm, setClientForm] = useState<Record<string, string>>({});
  const [clientMessage, setClientMessage] = useState('');

  const [templateSections, setTemplateSections] = useState<SectionDef[]>(buildReportSections());

  useEffect(() => {
    const cacheKey = 'alara-report-template:INSPECTION_REPORT_V1';
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed?.payload?.sections?.length) {
          const sections = parsed.payload.sections.map((section: any) => ({
            code: section.code,
            title: section.title,
            fields: (section.fields ?? []).map((field: any) => ({
              key: field.key,
              label: field.label,
              type: field.type === 'TEXTAREA' ? 'textarea' : 'text',
            })),
          }));
          setTemplateSections(sections);
        }
      } catch (error) {
        // ignore cache parse errors
      }
    }

    const role = portal === 'aseguradora' ? 'INSURER' : 'ALARA';
    getInspectionRequest(Number(id), role)
      .then((resp) => {
        if (resp?.report_template?.payload?.sections?.length) {
          const cachedData = cached ? JSON.parse(cached) : null;
          const remoteUpdated =
            resp.report_template.updated_at ?? resp.report_template.created_at ?? null;
          const cachedUpdated = cachedData?.updated_at ?? cachedData?.created_at ?? null;
          if (remoteUpdated !== cachedUpdated) {
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                code: resp.report_template.code,
                updated_at: resp.report_template.updated_at ?? null,
                created_at: resp.report_template.created_at ?? null,
                payload: resp.report_template.payload,
              }),
            );
            const sections = resp.report_template.payload.sections.map((section: any) => ({
              code: section.code,
              title: section.title,
              fields: (section.fields ?? []).map((field: any) => ({
                key: field.key,
                label: field.label,
                type: field.type === 'TEXTAREA' ? 'textarea' : 'text',
              })),
            }));
            setTemplateSections(sections);
          }
        }
        setData(resp);
      })
      .catch(() => setData(null));
  }, [id, portal]);

  const reportSections = useMemo(() => templateSections, [templateSections]);
  const initialReportValues = useMemo(() => {
    if (!data) return {};
    return {
      pa_name: data.client ? `${data.client.first_name ?? ''} ${data.client.last_name ?? ''}`.trim() : '',
      email: data.client?.email ?? '',
      mobile: data.client?.phone_mobile ?? '',
      dob: data.client?.dob ?? '',
      document: `${data.client?.id_type ?? ''} ${data.client?.id_number ?? ''}`.trim(),
      profession_studies: data.client?.profession ?? '',
      employer: data.client?.employer_name ?? '',
    };
  }, [data]);

  const timelineItems = useMemo(() => {
    if (!data) return [];
    const items = [
      data.created_at ? { label: 'Solicitud creada', date: data.created_at } : null,
      data.scheduled_start_at ? { label: 'Inspección agendada', date: data.scheduled_start_at } : null,
      data.completed_at ? { label: 'Entrevista completada', date: data.completed_at } : null,
    ].filter(Boolean) as { label: string; date: string }[];

    return items.length
      ? items
      : [
          { label: 'Solicitud en curso', date: new Date().toISOString() },
        ];
  }, [data]);

  useEffect(() => {
    if (!id || activeTab !== 'investigaciones') return;
    const role = portal === 'aseguradora' ? 'INSURER' : 'ALARA';
    getInvestigations(Number(id), role)
      .then((resp) => setInvestigations(resp as any[]))
      .catch(() => setInvestigations([]));
  }, [activeTab, id, portal]);

  const handleInvestigate = async () => {
    if (!id) return;
    setInvestigationMessage('');
    const stored = localStorage.getItem('alara-investigation-sources');
    const sources = stored ? (JSON.parse(stored) as { name: string; url: string }[]) : [];
    try {
      await triggerInvestigation(Number(id), sources);
      setInvestigationMessage('Investigación enviada a n8n.');
    } catch (error) {
      setInvestigationMessage('No se pudo iniciar la investigación.');
    }
  };

  const handleStartCall = async () => {
    if (!id) return;
    setCallMessage('');
    try {
      await startInspectionCall(Number(id));
      setCallMessage('Llamada iniciada en n8n.');
    } catch (error) {
      setCallMessage('No se pudo iniciar la llamada.');
    }
  };

  useEffect(() => {
    const existingValues: Record<string, string> = { ...(initialReportValues as Record<string, string>) };
    if (data?.inspection_report?.sections?.length) {
      data.inspection_report.sections.forEach((section) => {
        section.fields.forEach((field) => {
          if (field.field_key) {
            existingValues[field.field_key] = field.field_value ?? '';
          }
        });
      });
    }
    setReportValues(existingValues);
    setReportSummary(data?.inspection_report?.summary ?? '');
    setReportComments(data?.inspection_report?.additional_comments ?? '');
    if (data?.inspection_report?.outcome) {
      setReportOutcome(data.inspection_report.outcome as any);
    }
  }, [initialReportValues]);

  const updateReportValue = (key: string, value: string) => {
    setReportValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveReport = async () => {
    if (!id) return;
    setReportMessage('');
    const payload = {
      outcome: reportOutcome,
      summary: reportSummary || undefined,
      additional_comments: reportComments || undefined,
      sections: reportSections.map((section, index) => ({
        code: section.code ?? section.title.toUpperCase().replace(/\s+/g, '_'),
        title: section.title,
        order: index,
        fields: section.fields.map((field) => ({
          key: field.key,
          label: field.label,
          type: field.type === 'textarea' ? 'TEXT' : 'TEXT',
          value: reportValues[field.key] ?? '',
        })),
      })),
    };

    try {
      await saveInspectionReport(Number(id), payload, portal === 'alara' ? 'ALARA' : 'INSURER');
      setReportMessage('Reporte guardado y PDF generado.');
      setShowReportForm(false);
      const role = portal === 'aseguradora' ? 'INSURER' : 'ALARA';
      const refreshed = await getInspectionRequest(Number(id), role);
      setData(refreshed);
    } catch (error) {
      setReportMessage('No se pudo guardar el reporte.');
    }
  };

  const handleShareReport = async () => {
    if (!id) return;
    try {
      await shareInspectionReport(Number(id), 'ALARA');
      setReportMessage('Reporte enviado a la aseguradora.');
      const role = portal === 'aseguradora' ? 'INSURER' : 'ALARA';
      const refreshed = await getInspectionRequest(Number(id), role);
      setData(refreshed);
    } catch (error) {
      setReportMessage('No se pudo enviar el reporte.');
    }
  };

  const startEditingClient = () => {
    const c = data?.client;
    setClientForm({
      first_name: c?.first_name ?? '',
      last_name: c?.last_name ?? '',
      dob: c?.dob ? (typeof c.dob === 'string' ? c.dob.slice(0, 10) : '') : '',
      id_type: c?.id_type ?? 'CEDULA',
      id_number: c?.id_number ?? '',
      email: c?.email ?? '',
      phone_mobile: c?.phone_mobile ?? '',
      phone_home: c?.phone_home ?? '',
      phone_work: c?.phone_work ?? '',
      employer_name: c?.employer_name ?? '',
      employer_tax_id: c?.employer_tax_id ?? '',
      profession: c?.profession ?? '',
    });
    setClientMessage('');
    setEditingClient(true);
  };

  const cancelEditingClient = () => {
    setEditingClient(false);
    setClientMessage('');
  };

  const handleSaveClient = async () => {
    if (!id || !data) return;
    if (!clientForm.first_name?.trim() || !clientForm.last_name?.trim()) {
      setClientMessage('Nombre y apellidos son obligatorios.');
      return;
    }
    setClientMessage('');
    const role = portal === 'aseguradora' ? 'INSURER' : 'ALARA';
    const payload: UpdateClientPayload = {
      first_name: clientForm.first_name || undefined,
      last_name: clientForm.last_name || undefined,
      dob: clientForm.dob || undefined,
      id_type: (clientForm.id_type as 'CEDULA' | 'PASSPORT' | 'OTRO') || undefined,
      id_number: clientForm.id_number || undefined,
      email: clientForm.email || undefined,
      phone_mobile: clientForm.phone_mobile || undefined,
      phone_home: clientForm.phone_home || undefined,
      phone_work: clientForm.phone_work || undefined,
      employer_name: clientForm.employer_name || undefined,
      employer_tax_id: clientForm.employer_tax_id || undefined,
      profession: clientForm.profession || undefined,
    };
    try {
      const refreshed = await updateInspectionRequestClient(
        Number(id),
        payload,
        role,
        portal === 'aseguradora' ? Number(localStorage.getItem('alara-insurer-id') || 0) || undefined : undefined,
      );
      if (refreshed) {
        setData(refreshed);
        setEditingClient(false);
        setClientMessage('Datos del cliente guardados.');
      } else {
        setClientMessage('No se pudo guardar.');
      }
    } catch (error) {
      setClientMessage('No se pudo guardar. Verifica los datos.');
    }
  };

  if (!data) {
    return (
      <div className="page">
        <div className="info-card">
          <p>No se pudo cargar la solicitud.</p>
          <button className="ghost-button" onClick={() => navigate(-1)}>
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="info-card">
        <div className="detail-header">
          <div>
            <h2>Expediente {data.request_number}</h2>
            <p>{data.insurer?.name ?? 'Aseguradora'} · Responsable: {data.responsible_name}</p>
          </div>
          <StatusBadge status={data.status} />
        </div>
      </div>

      <div className="tabs">
        <button className={activeTab === 'general' ? 'tab active' : 'tab'} onClick={() => setActiveTab('general')}>
          General
        </button>
        <button className={activeTab === 'cliente' ? 'tab active' : 'tab'} onClick={() => setActiveTab('cliente')}>
          Cliente
        </button>
        <button className={activeTab === 'solicitud' ? 'tab active' : 'tab'} onClick={() => setActiveTab('solicitud')}>
          Solicitud
        </button>
        <button className={activeTab === 'reporte' ? 'tab active' : 'tab'} onClick={() => setActiveTab('reporte')}>
          Reporte
        </button>
        <button
          className={activeTab === 'documentacion' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('documentacion')}
        >
          Documentación
        </button>
        <button
          className={activeTab === 'investigaciones' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('investigaciones')}
        >
          Investigaciones
        </button>
      </div>

      {activeTab === 'general' && (
        <div className="grid-two">
          <div className="info-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h4 style={{ margin: 0 }}>Datos del cliente</h4>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setActiveTab('cliente');
                  setTimeout(() => startEditingClient(), 0);
                }}
              >
                Editar
              </button>
            </div>
            <ul className="details-list">
              <li>
                <span>Nombre</span>
                <strong>{data.client ? `${data.client.first_name ?? ''} ${data.client.last_name ?? ''}` : '—'}</strong>
              </li>
              <li>
                <span>Documento</span>
                <strong>
                  {data.client?.id_type ?? '—'} {data.client?.id_number ?? ''}
                </strong>
              </li>
              <li>
                <span>Correo</span>
                <strong>{data.client?.email ?? '—'}</strong>
              </li>
              <li>
                <span>Profesión</span>
                <strong>{data.client?.profession ?? '—'}</strong>
              </li>
            </ul>
          </div>
          <div className="info-card">
            <h4>Documentos</h4>
            <div className="file-row">
              <span>Solicitud de Inspección</span>
              <button
                className="ghost-button"
                onClick={() => downloadPdf(Number(data.id), 'solicitud')}
              >
                Descargar
              </button>
            </div>
            <div className="file-row">
              <span>Reporte de inspección</span>
              <div className="file-actions">
                {data.status === 'REALIZADA' && !data.report_shared_at && (
                  <span className="pending-pill">Pendiente de envío</span>
                )}
                {['REALIZADA', 'APROBADA', 'RECHAZADA'].includes(data.status) &&
                (portal === 'alara' || data.report_shared_at) ? (
                  <button
                    className="ghost-button"
                    onClick={() => downloadPdf(Number(data.id), 'reporte')}
                  >
                    Descargar
                  </button>
                ) : (
                  <span>En proceso</span>
                )}
              </div>
            </div>
            {portal === 'alara' && (
              <div className="file-row">
                <span>Llamada</span>
                <button className="ghost-button" onClick={handleStartCall}>
                  Llamar
                </button>
              </div>
            )}
            <div className="file-row">
              <span>Investigación</span>
              <button className="ghost-button" onClick={handleInvestigate}>
                Investigar
              </button>
            </div>
            {callMessage && <span className="form-message">{callMessage}</span>}
          </div>
        </div>
      )}

      {activeTab === 'cliente' && (
        <div className="info-card">
          {editingClient ? (
            <div className="report-form">
              <div className="form-section">
                <h4>Editar datos del cliente</h4>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Nombre</span>
                    <input
                      value={clientForm.first_name ?? ''}
                      onChange={(e) => setClientForm((f) => ({ ...f, first_name: e.target.value }))}
                    />
                  </label>
                  <label className="form-field">
                    <span>Apellidos</span>
                    <input
                      value={clientForm.last_name ?? ''}
                      onChange={(e) => setClientForm((f) => ({ ...f, last_name: e.target.value }))}
                    />
                  </label>
                  <label className="form-field">
                    <span>Fecha de nacimiento</span>
                    <input
                      type="date"
                      value={clientForm.dob ?? ''}
                      onChange={(e) => setClientForm((f) => ({ ...f, dob: e.target.value }))}
                    />
                  </label>
                  <label className="form-field">
                    <span>Tipo documento</span>
                    <select
                      value={clientForm.id_type ?? 'CEDULA'}
                      onChange={(e) =>
                        setClientForm((f) => ({
                          ...f,
                          id_type: e.target.value as 'CEDULA' | 'PASSPORT' | 'OTRO',
                        }))
                      }
                    >
                      <option value="CEDULA">Cédula</option>
                      <option value="PASSPORT">Pasaporte</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Número documento</span>
                    <input
                      value={clientForm.id_number ?? ''}
                      onChange={(e) => setClientForm((f) => ({ ...f, id_number: e.target.value }))}
                    />
                  </label>
                  <label className="form-field">
                    <span>Email</span>
                    <input
                      type="email"
                      value={clientForm.email ?? ''}
                      onChange={(e) => setClientForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </label>
                  <label className="form-field">
                    <span>Teléfono móvil</span>
                    <input
                      value={clientForm.phone_mobile ?? ''}
                      onChange={(e) => setClientForm((f) => ({ ...f, phone_mobile: e.target.value }))}
                    />
                  </label>
                  <label className="form-field">
                    <span>Teléfono residencia</span>
                    <input
                      value={clientForm.phone_home ?? ''}
                      onChange={(e) => setClientForm((f) => ({ ...f, phone_home: e.target.value }))}
                    />
                  </label>
                  <label className="form-field">
                    <span>Teléfono laboral</span>
                    <input
                      value={clientForm.phone_work ?? ''}
                      onChange={(e) => setClientForm((f) => ({ ...f, phone_work: e.target.value }))}
                    />
                  </label>
                  <label className="form-field">
                    <span>Empresa</span>
                    <input
                      value={clientForm.employer_name ?? ''}
                      onChange={(e) => setClientForm((f) => ({ ...f, employer_name: e.target.value }))}
                    />
                  </label>
                  <label className="form-field">
                    <span>CUIT / NIT / RUC</span>
                    <input
                      value={clientForm.employer_tax_id ?? ''}
                      onChange={(e) => setClientForm((f) => ({ ...f, employer_tax_id: e.target.value }))}
                    />
                  </label>
                  <label className="form-field">
                    <span>Profesión</span>
                    <input
                      value={clientForm.profession ?? ''}
                      onChange={(e) => setClientForm((f) => ({ ...f, profession: e.target.value }))}
                    />
                  </label>
                </div>
              </div>
              <div className="form-actions">
                <button className="primary-button" onClick={handleSaveClient}>
                  Guardar
                </button>
                <button className="ghost-button" onClick={cancelEditingClient}>
                  Cancelar
                </button>
                {clientMessage && <span className="form-message">{clientMessage}</span>}
              </div>
            </div>
          ) : (
            <>
              <div className="details-grid">
                <div>
                  <span>Nombre</span>
                  <strong>{data.client ? `${data.client.first_name ?? ''} ${data.client.last_name ?? ''}` : '—'}</strong>
                </div>
                <div>
                  <span>Documento</span>
                  <strong>
                    {data.client?.id_type ?? '—'} {data.client?.id_number ?? ''}
                  </strong>
                </div>
                <div>
                  <span>Email</span>
                  <strong>{data.client?.email ?? '—'}</strong>
                </div>
                <div>
                  <span>Teléfono móvil</span>
                  <strong>{data.client?.phone_mobile ?? '—'}</strong>
                </div>
                <div>
                  <span>Teléfono residencia</span>
                  <strong>{data.client?.phone_home ?? '—'}</strong>
                </div>
                <div>
                  <span>Empresa</span>
                  <strong>{data.client?.employer_name ?? '—'}</strong>
                </div>
                <div>
                  <span>Profesión</span>
                  <strong>{data.client?.profession ?? '—'}</strong>
                </div>
              </div>
              <div className="form-actions" style={{ marginTop: '1rem' }}>
                <button className="ghost-button" onClick={startEditingClient}>
                  Editar datos del cliente
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'solicitud' && (
        <div className="info-card">
          <div className="details-grid">
            <div>
              <span>Aseguradora</span>
              <strong>{data.insurer?.name ?? '—'}</strong>
            </div>
            <div>
              <span>Número de solicitud</span>
              <strong>{data.request_number ?? '—'}</strong>
            </div>
            <div>
              <span>Responsable</span>
              <strong>{data.responsible_name}</strong>
            </div>
            <div>
              <span>Teléfono responsable</span>
              <strong>{data.responsible_phone ?? '—'}</strong>
            </div>
            <div>
              <span>Email responsable</span>
              <strong>{data.responsible_email ?? '—'}</strong>
            </div>
            <div>
              <span>Agente</span>
              <strong>{data.agent_name ?? '—'}</strong>
            </div>
            <div>
              <span>Monto asegurado</span>
              <strong>{data.insured_amount ?? '—'}</strong>
            </div>
            <div>
              <span>Monto vigente</span>
              <strong>{data.has_amount_in_force ? 'Sí' : 'No'}</strong>
            </div>
            <div>
              <span>Estado civil</span>
              <strong>{data.client?.marital_status ?? data.marital_status ?? '—'}</strong>
            </div>
            <div>
              <span>Idioma entrevista</span>
              <strong>{data.interview_language ?? '—'}</strong>
            </div>
            <div>
              <span>Cliente avisado</span>
              <strong>{data.client_notified ? 'Sí' : 'No'}</strong>
            </div>
            <div>
              <span>Prioridad</span>
              <strong>{data.priority ?? 'NORMAL'}</strong>
            </div>
            <div>
              <span>Agendada inicio</span>
              <strong>{data.scheduled_start_at ?? '—'}</strong>
            </div>
            <div>
              <span>Agendada fin</span>
              <strong>{data.scheduled_end_at ?? '—'}</strong>
            </div>
            <div className="details-wide">
              <span>Comentarios</span>
              <strong>{data.comments ?? '—'}</strong>
            </div>
            <div>
              <span>Dirección</span>
              <strong>{data.client?.address_line ?? '—'}</strong>
            </div>
            <div>
              <span>Ciudad</span>
              <strong>{data.client?.city ?? '—'}</strong>
            </div>
            <div>
              <span>País</span>
              <strong>{data.client?.country ?? '—'}</strong>
            </div>
            <div>
              <span>Teléfono residencial</span>
              <strong>{data.client?.phone_home ?? '—'}</strong>
            </div>
            <div>
              <span>Teléfono laboral</span>
              <strong>{data.client?.phone_work ?? '—'}</strong>
            </div>
            <div>
              <span>Teléfono celular</span>
              <strong>{data.client?.phone_mobile ?? '—'}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{data.client?.email ?? '—'}</strong>
            </div>
            <div>
              <span>Empresa/Empleador</span>
              <strong>{data.client?.employer_name ?? '—'}</strong>
            </div>
            <div>
              <span>CUIT / NIT / RUC</span>
              <strong>{data.client?.employer_tax_id ?? '—'}</strong>
            </div>
            <div>
              <span>Profesión</span>
              <strong>{data.client?.profession ?? '—'}</strong>
            </div>
            <div>
              <span>Tareas</span>
              <strong>{data.client?.tasks ?? '—'}</strong>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reporte' && (
        <div className="info-card">
          {showReportForm && (
            <div className="report-form">
              <div className="form-section">
                <h4>Resumen del reporte</h4>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Resultado</span>
                    <select
                      value={reportOutcome}
                      onChange={(event) =>
                        setReportOutcome(
                          event.target.value as 'PENDIENTE' | 'FAVORABLE' | 'NO_FAVORABLE' | 'INCONCLUSO',
                        )
                      }
                    >
                      <option value="PENDIENTE">Pendiente</option>
                      <option value="FAVORABLE">Favorable</option>
                      <option value="NO_FAVORABLE">No favorable</option>
                      <option value="INCONCLUSO">Inconcluso</option>
                    </select>
                  </label>
                  <label className="form-field details-wide">
                    <span>Resumen</span>
                    <textarea value={reportSummary} onChange={(e) => setReportSummary(e.target.value)} rows={3} />
                  </label>
                  <label className="form-field details-wide">
                    <span>Comentarios adicionales</span>
                    <textarea value={reportComments} onChange={(e) => setReportComments(e.target.value)} rows={3} />
                  </label>
                </div>
              </div>
              {reportSections.map((section) => (
                <div key={section.title} className="form-section">
                  <h4>{section.title}</h4>
                  <div className="form-grid">
                    {section.fields.map((field) => {
                      return (
                        <label key={field.key} className="form-field">
                          <span>{field.label}</span>
                          {field.type === 'textarea' ? (
                            <textarea
                              value={reportValues[field.key] ?? ''}
                              onChange={(event) => updateReportValue(field.key, event.target.value)}
                              rows={3}
                            />
                          ) : (
                            <input
                              type="text"
                              value={reportValues[field.key] ?? ''}
                              onChange={(event) => updateReportValue(field.key, event.target.value)}
                            />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="form-actions">
                <button className="primary-button" onClick={handleSaveReport}>
                  Guardar reporte
                </button>
                {portal === 'alara' && data.status === 'REALIZADA' && !data.report_shared_at && (
                  <button className="ghost-button" onClick={handleShareReport}>
                    Enviar a la aseguradora
                  </button>
                )}
                {['REALIZADA', 'APROBADA', 'RECHAZADA'].includes(data.status) &&
                (portal === 'alara' || data.report_shared_at) ? (
                  <button
                    className="ghost-button"
                    onClick={() => downloadPdf(Number(data.id), 'reporte')}
                  >
                    Descargar Reporte PDF
                  </button>
                ) : null}
                {reportMessage && <span className="form-message">{reportMessage}</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'documentacion' && (
        <div className="info-card">
          <h4>Documentación</h4>
          <p>Sube, visualiza y gestiona todos los documentos del expediente.</p>
          <div className="form-actions">
            <input
              type="file"
              multiple
              onChange={(event) => {
                const files = event.target.files ? Array.from(event.target.files) : [];
                setDocuments((prev) => [...prev, ...files]);
              }}
            />
          </div>
          <div className="list-block">
            {documents.map((file, index) => (
              <div key={`${file.name}-${index}`} className="list-row">
                <div>
                  <strong>{file.name}</strong>
                  <span>{Math.round(file.size / 1024)} KB</span>
                </div>
                <button
                  className="ghost-button"
                  onClick={() => setDocuments(documents.filter((_, idx) => idx !== index))}
                >
                  Quitar
                </button>
              </div>
            ))}
            {!documents.length && <p>No hay documentos cargados.</p>}
          </div>
        </div>
      )}

      {activeTab === 'investigaciones' && (
        <div className="info-card">
          <div className="report-actions">
            {portal === 'alara' && (
              <button className="primary-button" onClick={handleInvestigate}>
                Investigar
              </button>
            )}
            {investigationMessage && <span className="form-message">{investigationMessage}</span>}
          </div>
          <div className="list-block">
            {investigations.map((item) => (
              <div key={item.id} className="list-row">
                <div>
                  <strong>{item.source_name ?? 'Fuente'}</strong>
                  <span>{item.finding_summary}</span>
                </div>
                <span>{item.risk_level}</span>
              </div>
            ))}
            {!investigations.length && <p>No hay investigaciones registradas.</p>}
          </div>
        </div>
      )}

      <div className="info-card">
        <h4>Línea de tiempo</h4>
        <div className="timeline">
          {timelineItems.map((item, index) => (
            <div key={`${item.label}-${index}`}>
              <span>{new Date(item.date).toLocaleDateString()}</span>
              <p>{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RequestDetailPage;

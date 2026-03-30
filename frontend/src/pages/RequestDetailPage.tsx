import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  downloadPdf,
  getInspectionRequest,
  getInspectionRequestDocuments,
  openInspectionRequestDocument,
  getInvestigations,
  saveInspectionReport,
  shareInspectionReport,
  startInspectionCall,
  triggerInvestigation,
  updateInspectionRequestClient,
  updateInspectionRequestStatus,
  type RequestDocument,
  type UpdateClientPayload,
} from '../data/api';
import StatusBadge from '../components/StatusBadge';
import CancelInspectionRequestModal from '../components/CancelInspectionRequestModal';
import InvestigationsUafSection from '../components/InvestigationsUafSection';
import ReportFormField from '../components/ReportFormField';
import { defaultReportSections } from '../report/defaultReportSections';
import { mergeReportTemplate } from '../report/mergeReportTemplate';
import { migrateLegacyDatosPersonales } from '../report/migrateLegacyReportValues';
import {
  DATE_KEYS,
  isReportFieldVisible,
  mapApiFieldToDef,
  toApiFieldType,
  type ReportSectionDef,
} from '../report/fieldTypes';
import { ageInYearsFromDdMmYyyy, isoLikeToDdMmYyyy, isValidDdMmYyyy } from '../utils/ddMmYyyyDate';
import { isPanamaCedula, PANAMA_CEDULA_HINT } from '../utils/panamaCedula';

type RequestDetailProps = {
  portal: 'aseguradora' | 'alara';
};

function idTypeLabel(t?: string) {
  if (!t) return '—';
  if (t === 'CEDULA') return 'Cédula';
  if (t === 'PASSPORT') return 'Pasaporte';
  if (t === 'OTRO') return 'Otro';
  return t;
}

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

const CANCELLABLE_STATUSES = new Set(['SOLICITADA', 'AGENDADA', 'REALIZADA']);

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
  amount_in_force?: string | number;
  marital_status?: string;
  interview_language?: string;
  priority?: string;
  comments?: string;
  client_notified?: boolean;
  service_type?: { id?: string | number; name?: string } | null;
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

const RequestDetailPage = ({ portal }: RequestDetailProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<RequestDetail | null>(null);
  const [activeTab, setActiveTab] = useState<
    'general' | 'cliente' | 'solicitud' | 'reporte' | 'documentacion' | 'investigaciones'
  >('general');
  const [showReportForm, setShowReportForm] = useState(true);
  const [reportValues, setReportValues] = useState<Record<string, string>>({});
  const [reportSummary, setReportSummary] = useState('');
  const [reportComments, setReportComments] = useState('');
  const [reportOutcome, setReportOutcome] = useState<'PENDIENTE' | 'FAVORABLE' | 'NO_FAVORABLE' | 'INCONCLUSO'>(
    'PENDIENTE',
  );
  const [reportMessage, setReportMessage] = useState('');
  const [reportSaveBusy, setReportSaveBusy] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [hasLocalReportDraft, setHasLocalReportDraft] = useState(false);
  const reportMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [documents, setDocuments] = useState<RequestDocument[]>([]);
  const [docOpenError, setDocOpenError] = useState('');
  const [openingDocId, setOpeningDocId] = useState<string | number | null>(null);
  const [investigationMessage, setInvestigationMessage] = useState('');
  const [uafSearchMode, setUafSearchMode] = useState<'cedula' | 'nombre' | 'ambos'>('ambos');
  const [callMessage, setCallMessage] = useState('');
  const [editingClient, setEditingClient] = useState(false);
  const [clientForm, setClientForm] = useState<Record<string, string>>({});
  const [clientMessage, setClientMessage] = useState('');
  const [schedulePanelOpen, setSchedulePanelOpen] = useState(false);
  const [scheduleDatetimeLocal, setScheduleDatetimeLocal] = useState('');
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState('');

  const mapPayloadToSections = (sections: any[]): ReportSectionDef[] => {
    const remote: ReportSectionDef[] = sections.map((section: any) => ({
      code: section.code,
      title: section.title,
      fields: (section.fields ?? []).map((field: any) => mapApiFieldToDef(field)),
    }));
    return mergeReportTemplate(remote);
  };

  const [templateSections, setTemplateSections] = useState<ReportSectionDef[]>(defaultReportSections());

  useEffect(() => {
    const cacheKey = 'alara-report-template:INSPECTION_REPORT_V1';
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed?.payload?.sections?.length) {
          setTemplateSections(mapPayloadToSections(parsed.payload.sections));
        }
      } catch {
        // ignore cache parse errors
      }
    }

    getInspectionRequest(Number(id), portal)
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
            setTemplateSections(mapPayloadToSections(resp.report_template.payload.sections));
          }
        }
        setData(resp);
      })
      .catch(() => setData(null));
  }, [id, portal]);

  const reportSections = useMemo(() => templateSections, [templateSections]);

  const solicitudDobDdMm = useMemo(
    () => (data?.client?.dob ? isoLikeToDdMmYyyy(data.client.dob) : ''),
    [data?.client?.dob],
  );
  const solicitudDobAge = useMemo(() => {
    if (!solicitudDobDdMm || !isValidDdMmYyyy(solicitudDobDdMm)) return null;
    return ageInYearsFromDdMmYyyy(solicitudDobDdMm);
  }, [solicitudDobDdMm]);
  /** Registros antiguos: monto solo en texto de comentarios. */
  const legacyMontoVigenciaFromComments = useMemo(() => {
    const c = data?.comments;
    if (!c) return '';
    const m = String(c).match(/Monto en vigencia:\s*([\d.]+)/i);
    return m ? m[1] : '';
  }, [data?.comments]);
  const montoVigenciaDisplay = useMemo(() => {
    const raw = data?.amount_in_force;
    if (raw !== null && raw !== undefined && String(raw).trim() !== '') {
      return String(raw);
    }
    return legacyMontoVigenciaFromComments;
  }, [data?.amount_in_force, legacyMontoVigenciaFromComments]);

  const canScheduleInterviewFromSolicitud =
    data?.status === 'SOLICITADA' && !data?.scheduled_start_at;
  const initialReportValues = useMemo(() => {
    if (!data) return {};
    const c = data.client;
    const marital = c?.marital_status ?? data.marital_status ?? '';
    return {
      first_name: c?.first_name ?? '',
      last_name: c?.last_name ?? '',
      id_type: c?.id_type ?? '',
      id_number: c?.id_number ?? '',
      home_address: c?.address_line ?? '',
      email: c?.email ?? '',
      mobile: c?.phone_mobile ?? '',
      dob: isoLikeToDdMmYyyy(c?.dob),
      marital_status: marital,
      profession_studies: c?.profession ?? '',
      employer: c?.employer_name ?? '',
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
    getInvestigations(Number(id), portal)
      .then((resp) => setInvestigations(resp as any[]))
      .catch(() => setInvestigations([]));
  }, [activeTab, id, portal]);

  useEffect(() => {
    if (!id || activeTab !== 'documentacion') return;
    setDocOpenError('');
    getInspectionRequestDocuments(Number(id), portal)
      .then((resp) => setDocuments(resp as RequestDocument[]))
      .catch(() => setDocuments([]));
  }, [activeTab, id, portal]);

  const handleOpenDocument = async (file: RequestDocument) => {
    if (!id) return;
    setDocOpenError('');
    setOpeningDocId(file.id);
    try {
      await openInspectionRequestDocument(Number(id), Number(file.id), portal);
    } catch {
      setDocOpenError('No se pudo abrir el documento. Inténtalo de nuevo.');
    } finally {
      setOpeningDocId(null);
    }
  };

  const handleScheduleInterview = async () => {
    if (!id) return;
    if (!scheduleDatetimeLocal.trim()) {
      setScheduleMessage('Indica la fecha y hora de la entrevista.');
      return;
    }
    const startMs = new Date(scheduleDatetimeLocal).getTime();
    if (Number.isNaN(startMs)) {
      setScheduleMessage('Fecha u hora no válida.');
      return;
    }
    setScheduleBusy(true);
    setScheduleMessage('');
    try {
      const startIso = new Date(scheduleDatetimeLocal).toISOString();
      const endIso = new Date(startMs + 60 * 60 * 1000).toISOString();
      await updateInspectionRequestStatus(
        Number(id),
        { new_status: 'AGENDADA', scheduled_start_at: startIso, scheduled_end_at: endIso },
        portal,
      );
      const resp = await getInspectionRequest(Number(id), portal);
      setData(resp);
      setSchedulePanelOpen(false);
      setScheduleDatetimeLocal('');
    } catch {
      setScheduleMessage('No se pudo agendar. Verifica permisos o la fecha y hora.');
    } finally {
      setScheduleBusy(false);
    }
  };

  const handleConfirmCancelRequest = async (reason: string) => {
    if (!id) return;
    setCancelBusy(true);
    setCancelError(null);
    try {
      await updateInspectionRequestStatus(
        Number(id),
        {
          new_status: 'CANCELADA',
          note: reason || 'Solicitud cancelada',
          ...(reason ? { cancellation_reason: reason } : {}),
        },
        portal,
      );
      const resp = await getInspectionRequest(Number(id), portal);
      setData(resp);
      setCancelModalOpen(false);
    } catch {
      setCancelError('No se pudo cancelar. Verifica el estado o los permisos.');
    } finally {
      setCancelBusy(false);
    }
  };

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
            let v = field.field_value ?? '';
            if (DATE_KEYS.has(field.field_key) && v) {
              v = isoLikeToDdMmYyyy(v);
            }
            existingValues[field.field_key] = v;
          }
        });
      });
    }
    migrateLegacyDatosPersonales(existingValues);
    setReportValues(existingValues);
    setReportSummary(data?.inspection_report?.summary ?? '');
    setReportComments(data?.inspection_report?.additional_comments ?? '');
    if (data?.inspection_report?.outcome) {
      setReportOutcome(data.inspection_report.outcome as any);
    }
  }, [initialReportValues, data?.inspection_report]);

  const reportDraftStorageKey = id && portal === 'alara' ? `alara-report-draft:${id}` : '';

  const updateReportValue = (key: string, value: string) => {
    setReportValues((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'previous_rejected' && value !== 'Sí') {
        next.previous_rejection_reason = '';
      }
      return next;
    });
  };

  const persistReportDraft = useCallback(() => {
    if (!reportDraftStorageKey) return;
    try {
      localStorage.setItem(
        reportDraftStorageKey,
        JSON.stringify({
          reportValues,
          reportSummary,
          reportComments,
          reportOutcome,
          v: 1,
        }),
      );
      setHasLocalReportDraft(true);
    } catch {
      // ignore quota / private mode
    }
  }, [reportDraftStorageKey, reportValues, reportSummary, reportComments, reportOutcome]);

  useEffect(() => {
    if (!reportDraftStorageKey || activeTab !== 'reporte') return;
    const t = window.setTimeout(persistReportDraft, 1600);
    return () => window.clearTimeout(t);
  }, [reportDraftStorageKey, activeTab, persistReportDraft]);

  useEffect(() => {
    if (!id || activeTab !== 'reporte' || portal !== 'alara') {
      setHasLocalReportDraft(false);
      return;
    }
    try {
      setHasLocalReportDraft(!!localStorage.getItem(`alara-report-draft:${id}`));
    } catch {
      setHasLocalReportDraft(false);
    }
  }, [id, activeTab, portal]);

  const handleRecoverReportDraft = () => {
    if (!reportDraftStorageKey) return;
    try {
      const raw = localStorage.getItem(reportDraftStorageKey);
      if (!raw) return;
      const d = JSON.parse(raw) as {
        reportValues?: Record<string, string>;
        reportSummary?: string;
        reportComments?: string;
        reportOutcome?: string;
      };
      if (d.reportValues && typeof d.reportValues === 'object') {
        setReportValues((prev) => ({ ...prev, ...d.reportValues }));
      }
      if (d.reportSummary !== undefined) setReportSummary(d.reportSummary);
      if (d.reportComments !== undefined) setReportComments(d.reportComments);
      if (
        d.reportOutcome &&
        ['PENDIENTE', 'FAVORABLE', 'NO_FAVORABLE', 'INCONCLUSO'].includes(d.reportOutcome)
      ) {
        setReportOutcome(
          d.reportOutcome as 'PENDIENTE' | 'FAVORABLE' | 'NO_FAVORABLE' | 'INCONCLUSO',
        );
      }
      setReportMessage('Borrador local recuperado.');
      if (reportMessageTimerRef.current) window.clearTimeout(reportMessageTimerRef.current);
      reportMessageTimerRef.current = window.setTimeout(() => setReportMessage(''), 5000);
    } catch {
      setReportMessage('No se pudo leer el borrador local.');
    }
  };

  const handleSaveReport = async (generateReportPdf: boolean) => {
    if (!id) return;
    if (reportMessageTimerRef.current) {
      window.clearTimeout(reportMessageTimerRef.current);
      reportMessageTimerRef.current = null;
    }
    setReportMessage('');
    const invalidDates: string[] = [];
    reportSections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.type === 'date') {
          const v = (reportValues[field.key] ?? '').trim();
          if (v && !isValidDdMmYyyy(v)) {
            invalidDates.push(field.label);
          }
        }
      });
    });
    if (invalidDates.length) {
      setReportMessage(`Revise fechas en formato dd/mm/aaaa: ${invalidDates.join(', ')}`);
      return;
    }

    const payload = {
      outcome: reportOutcome,
      summary: reportSummary || undefined,
      additional_comments: reportComments || undefined,
      generate_report_pdf: generateReportPdf,
      sections: reportSections.map((section, index) => ({
        code: section.code ?? section.title.toUpperCase().replace(/\s+/g, '_'),
        title: section.title,
        order: index,
        fields: section.fields.map((field) => ({
          key: field.key,
          label: field.label,
          type: toApiFieldType(field),
          value: reportValues[field.key] ?? '',
        })),
      })),
    };

    setReportSaveBusy(true);
    try {
      await saveInspectionReport(Number(id), payload, portal);
      if (reportDraftStorageKey) {
        try {
          localStorage.removeItem(reportDraftStorageKey);
        } catch {
          /* ignore */
        }
        setHasLocalReportDraft(false);
      }
      setReportMessage(
        generateReportPdf
          ? 'Guardado y finalizado. Se generó el PDF del reporte. Puedes seguir editando si lo necesitas.'
          : 'Guardado correctamente. Puedes seguir editando (el PDF se genera al usar Guardar y Finalizar).',
      );
      const refreshed = await getInspectionRequest(Number(id), portal);
      setData(refreshed);
      reportMessageTimerRef.current = window.setTimeout(() => setReportMessage(''), 8000);
    } catch (error) {
      setReportMessage('No se pudo guardar el reporte.');
    } finally {
      setReportSaveBusy(false);
    }
  };

  const handleShareReport = async () => {
    if (!id) return;
    try {
      await shareInspectionReport(Number(id), portal);
      setReportMessage('Reporte enviado a la aseguradora.');
      const refreshed = await getInspectionRequest(Number(id), portal);
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
      address_line: c?.address_line ?? '',
      city: c?.city ?? '',
      country: c?.country ?? '',
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
    if (clientForm.id_type === 'CEDULA' && clientForm.id_number?.trim() && !isPanamaCedula(clientForm.id_number)) {
      setClientMessage('Formato de cédula de Panamá no válido. ' + PANAMA_CEDULA_HINT);
      return;
    }
    setClientMessage('');
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
      address_line: clientForm.address_line || undefined,
      city: clientForm.city || undefined,
      country: clientForm.country || undefined,
      employer_name: clientForm.employer_name || undefined,
      employer_tax_id: clientForm.employer_tax_id || undefined,
      profession: clientForm.profession || undefined,
    };
    try {
      const refreshed = await updateInspectionRequestClient(
        Number(id),
        payload,
        portal,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {CANCELLABLE_STATUSES.has(data.status) && (
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setCancelError(null);
                  setCancelModalOpen(true);
                }}
              >
                Cancelar solicitud
              </button>
            )}
            <StatusBadge status={data.status} />
          </div>
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
        {portal !== 'aseguradora' && (
          <button className={activeTab === 'reporte' ? 'tab active' : 'tab'} onClick={() => setActiveTab('reporte')}>
            Reporte
          </button>
        )}
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
                <span>Profesión/Ocupación</span>
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
                    <span>Nombre <span className="field-required" aria-label="obligatorio">*</span></span>
                    <input
                      value={clientForm.first_name ?? ''}
                      onChange={(e) => setClientForm((f) => ({ ...f, first_name: e.target.value }))}
                    />
                  </label>
                  <label className="form-field">
                    <span>Apellidos <span className="field-required" aria-label="obligatorio">*</span></span>
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
                    <span>Número documento {clientForm.id_type === 'CEDULA' && <span className="field-required" aria-label="obligatorio">*</span>}</span>
                    <input
                      value={clientForm.id_number ?? ''}
                      onChange={(e) => setClientForm((f) => ({ ...f, id_number: e.target.value }))}
                      placeholder={clientForm.id_type === 'CEDULA' ? 'Ej: 1-1234-12345 o E-8-157481' : undefined}
                    />
                    {clientForm.id_type === 'CEDULA' && (
                      <span className="field-error" style={{ color: '#64748b', fontWeight: 'normal', fontSize: '0.75rem' }}>{PANAMA_CEDULA_HINT}</span>
                    )}
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
                    <span>Dirección</span>
                    <input
                      value={clientForm.address_line ?? ''}
                      onChange={(e) => setClientForm((f) => ({ ...f, address_line: e.target.value }))}
                    />
                  </label>
                  <label className="form-field">
                    <span>Ciudad</span>
                    <input
                      value={clientForm.city ?? ''}
                      onChange={(e) => setClientForm((f) => ({ ...f, city: e.target.value }))}
                    />
                  </label>
                  <label className="form-field">
                    <span>País</span>
                    <input
                      value={clientForm.country ?? ''}
                      onChange={(e) => setClientForm((f) => ({ ...f, country: e.target.value }))}
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
                    <span>Profesión/Ocupación</span>
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
                  <span>Teléfono laboral</span>
                  <strong>{data.client?.phone_work ?? '—'}</strong>
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
                  <span>Empresa</span>
                  <strong>{data.client?.employer_name ?? '—'}</strong>
                </div>
                <div>
                  <span>Profesión/Ocupación</span>
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
        <div className="info-card solicitud-tab-detail">
          <h4 className="solicitud-tab-detail__title">Aseguradora y trámite</h4>
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
              <span>Prioridad</span>
              <strong>{data.priority ?? 'NORMAL'}</strong>
            </div>
            <div>
              <span>Tipo de servicio</span>
              <strong>{data.service_type?.name ?? '—'}</strong>
            </div>
            <div>
              <span>Estado</span>
              <strong className="solicitud-tab-detail__status">
                <StatusBadge status={data.status} />
              </strong>
            </div>
          </div>

          <h4 className="solicitud-tab-detail__title">Entrevista</h4>
          <div className="details-grid">
            <div>
              <span>Fecha y hora de inicio</span>
              <strong>
                {data.scheduled_start_at
                  ? new Date(data.scheduled_start_at).toLocaleString()
                  : '—'}
              </strong>
            </div>
            <div>
              <span>Fecha y hora de fin</span>
              <strong>
                {data.scheduled_end_at ? new Date(data.scheduled_end_at).toLocaleString() : '—'}
              </strong>
            </div>
          </div>
          {canScheduleInterviewFromSolicitud && (
            <div className="solicitud-schedule-block">
              {!schedulePanelOpen ? (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    setSchedulePanelOpen(true);
                    setScheduleMessage('');
                  }}
                >
                  Agendar entrevista
                </button>
              ) : (
                <div className="form-grid solicitud-schedule-form">
                  <label className="form-field">
                    <span>Fecha y hora de la entrevista</span>
                    <input
                      type="datetime-local"
                      value={scheduleDatetimeLocal}
                      onChange={(e) => setScheduleDatetimeLocal(e.target.value)}
                    />
                  </label>
                  <div className="form-actions solicitud-schedule-form__actions">
                    <button
                      type="button"
                      className="primary-button"
                      disabled={scheduleBusy}
                      onClick={handleScheduleInterview}
                    >
                      {scheduleBusy ? 'Guardando…' : 'Confirmar'}
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={scheduleBusy}
                      onClick={() => {
                        setSchedulePanelOpen(false);
                        setScheduleDatetimeLocal('');
                        setScheduleMessage('');
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                  {scheduleMessage ? <span className="form-message">{scheduleMessage}</span> : null}
                </div>
              )}
            </div>
          )}

          <h4 className="solicitud-tab-detail__title">Datos del responsable</h4>
          <div className="details-grid">
            <div>
              <span>Persona responsable del pedido</span>
              <strong>{data.responsible_name}</strong>
            </div>
            <div>
              <span>Número de teléfono del responsable</span>
              <strong>{data.responsible_phone ?? '—'}</strong>
            </div>
            <div>
              <span>Mail del responsable</span>
              <strong>{data.responsible_email ?? '—'}</strong>
            </div>
          </div>

          <h4 className="solicitud-tab-detail__title">Datos del propuesto asegurado</h4>
          <div className="details-grid">
            <div>
              <span>Nombres</span>
              <strong>{data.client?.first_name ?? '—'}</strong>
            </div>
            <div>
              <span>Apellidos</span>
              <strong>{data.client?.last_name ?? '—'}</strong>
            </div>
            <div>
              <span>Fecha de nacimiento (dd/mm/aaaa)</span>
              <strong>
                {solicitudDobDdMm || '—'}
                {solicitudDobAge !== null && solicitudDobAge >= 0 && (
                  <span className="solicitud-tab-detail__age"> · Edad: {solicitudDobAge}{' '}
                  {solicitudDobAge === 1 ? 'año' : 'años'}</span>
                )}
                {solicitudDobAge !== null && solicitudDobAge < 0 && (
                  <span className="solicitud-tab-detail__age solicitud-tab-detail__age--warn">
                    {' '}
                    · Fecha futura
                  </span>
                )}
              </strong>
            </div>
            <div>
              <span>Tipo de documento</span>
              <strong>{idTypeLabel(data.client?.id_type)}</strong>
            </div>
            <div>
              <span>Número de documento</span>
              <strong>{data.client?.id_number?.trim() ? data.client.id_number : '—'}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{data.client?.email ?? '—'}</strong>
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
          </div>

          <h4 className="solicitud-tab-detail__title">Datos laborales</h4>
          <div className="details-grid">
            <div>
              <span>Nombre de la Empresa / Empleador</span>
              <strong>{data.client?.employer_name ?? '—'}</strong>
            </div>
            <div>
              <span>Profesión/Ocupación</span>
              <strong>{data.client?.profession ?? '—'}</strong>
            </div>
          </div>

          <h4 className="solicitud-tab-detail__title">Datos de la solicitud</h4>
          <div className="details-grid">
            <div>
              <span>Nombre del Agente</span>
              <strong>{data.agent_name ?? '—'}</strong>
            </div>
            <div>
              <span>Monto asegurado (USD)</span>
              <strong>{data.insured_amount ?? '—'}</strong>
            </div>
            <div>
              <span>¿Posee monto en vigencia?</span>
              <strong>{data.has_amount_in_force ? 'Sí' : 'No'}</strong>
            </div>
            {data.has_amount_in_force ? (
              <div>
                <span>Monto en vigencia</span>
                <strong>{montoVigenciaDisplay || '—'}</strong>
              </div>
            ) : null}
            <div>
              <span>Estado civil</span>
              <strong>{data.client?.marital_status ?? data.marital_status ?? '—'}</strong>
            </div>
            <div>
              <span>Idioma para la entrevista</span>
              <strong>{data.interview_language ?? '—'}</strong>
            </div>
            <div>
              <span>¿El cliente ha sido avisado?</span>
              <strong>{data.client_notified ? 'Sí' : 'No'}</strong>
            </div>
            <div className="details-wide">
              <span>Indicaciones / comentarios</span>
              <strong>{data.comments ?? '—'}</strong>
            </div>
          </div>
        </div>
      )}

      {portal !== 'aseguradora' && activeTab === 'reporte' && (
        <div className="info-card report-tab-card">
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
                <div key={section.code ?? section.title} className="form-section">
                  <h4>{section.title}</h4>
                  <div className="form-grid">
                    {section.fields
                      .filter((field) => isReportFieldVisible(field, reportValues))
                      .map((field) => (
                        <label key={field.key} className="form-field">
                          <span>{field.label}</span>
                          <ReportFormField
                            field={field}
                            value={reportValues[field.key] ?? ''}
                            onChange={updateReportValue}
                          />
                        </label>
                      ))}
                  </div>
                </div>
              ))}
              <div className="form-actions">
                <button
                  className="primary-button"
                  onClick={() => handleSaveReport(true)}
                  disabled={reportSaveBusy}
                >
                  {reportSaveBusy ? 'Guardando…' : 'Guardar y Finalizar'}
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

          {showReportForm && portal === 'alara' && (
            <div className="report-floating-save" role="region" aria-label="Guardado del reporte">
              <button
                type="button"
                className="primary-button report-floating-save__btn"
                onClick={() => handleSaveReport(false)}
                disabled={reportSaveBusy}
              >
                {reportSaveBusy ? 'Guardando…' : 'Guardar'}
              </button>
              {hasLocalReportDraft && (
                <button
                  type="button"
                  className="ghost-button report-floating-save__draft"
                  onClick={handleRecoverReportDraft}
                >
                  Recuperar borrador local
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'documentacion' && (
        <div className="info-card">
          <h4>Documentación</h4>
          <p>Documentos registrados para este trámite.</p>
          {docOpenError && <p className="form-message form-message--error">{docOpenError}</p>}
          <div className="list-block">
            {documents.map((file) => (
              <div key={String(file.id)} className="list-row list-row--document">
                <div>
                  <button
                    type="button"
                    className="doc-filename-link"
                    onClick={() => handleOpenDocument(file)}
                    disabled={openingDocId === file.id}
                    title="Abrir o descargar documento"
                  >
                    {openingDocId === file.id ? 'Abriendo…' : file.filename}
                  </button>
                  <span className="doc-meta">
                    {(Number(file.file_size_bytes) / 1024).toFixed(1)} KB · {file.doc_type} ·{' '}
                    {new Date(file.uploaded_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
            {!documents.length && <p>No hay documentos registrados.</p>}
          </div>
        </div>
      )}

      {activeTab === 'investigaciones' && (
        <div className="info-card info-card--uaf">
          <InvestigationsUafSection
            client={data?.client}
            investigations={investigations}
            searchMode={uafSearchMode}
            onSearchModeChange={setUafSearchMode}
          >
            <div className="uaf-validation__actions">
              {portal === 'alara' && (
                <button type="button" className="primary-button" onClick={handleInvestigate}>
                  Ejecutar investigación (n8n)
                </button>
              )}
              {investigationMessage && <span className="form-message">{investigationMessage}</span>}
            </div>
          </InvestigationsUafSection>

          {investigations.length > 0 && (
            <details className="uaf-validation__raw">
              <summary>Registros crudos de investigación</summary>
              <div className="list-block">
                {investigations.map((item: any) => (
                  <div key={String(item.id)} className="list-row">
                    <div>
                      <strong>{item.source_name ?? 'Fuente'}</strong>
                      <span>{item.finding_summary}</span>
                    </div>
                    <span>{item.risk_level}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
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

      <CancelInspectionRequestModal
        open={cancelModalOpen}
        requestLabel={`${data.request_number} · ${data.client ? `${data.client.first_name ?? ''} ${data.client.last_name ?? ''}`.trim() : 'Cliente'}`}
        busy={cancelBusy}
        error={cancelError}
        onClose={() => !cancelBusy && setCancelModalOpen(false)}
        onConfirm={handleConfirmCancelRequest}
      />
    </div>
  );
};

export default RequestDetailPage;

import { mockAlaraDashboard, mockInsurerDashboard, mockRequests } from './mock';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export const getApiUrl = () => API_URL;

export const login = (email: string, password: string) =>
  fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

const getStoredInsurerId = () => {
  const stored = localStorage.getItem('alara-insurer-id');
  return stored ? Number(stored) : undefined;
};

const defaultHeaders = (role: 'INSURER' | 'ALARA', insurerId?: number) => {
  const token = localStorage.getItem('alara-token');
  const effectiveInsurerId = insurerId ?? getStoredInsurerId();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'x-user-role': role,
    'x-user-id': '1',
    ...(effectiveInsurerId ? { 'x-insurer-id': String(effectiveInsurerId) } : {}),
  };
};

const safeFetch = async <T>(url: string, options?: RequestInit, fallback?: T): Promise<T> => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error('Request failed');
    }
    return (await response.json()) as T;
  } catch (error) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw error;
  }
};

export const getInsurerDashboard = (insurerId?: number) =>
  safeFetch(`${API_URL}/api/dashboard/insurer`, { headers: defaultHeaders('INSURER', insurerId) }, mockInsurerDashboard);

export const getAlaraDashboard = () =>
  safeFetch(`${API_URL}/api/dashboard/alara`, { headers: defaultHeaders('ALARA') }, mockAlaraDashboard);

export const getInspectionRequests = (role: 'INSURER' | 'ALARA', insurerId?: number) =>
  safeFetch(
    `${API_URL}/api/inspection-requests`,
    { headers: defaultHeaders(role, insurerId) },
    mockRequests,
  );

export const getInspectionRequest = (id: number, role: 'INSURER' | 'ALARA', insurerId?: number) =>
  safeFetch(`${API_URL}/api/inspection-requests/${id}`, { headers: defaultHeaders(role, insurerId) }, null);

export const createInspectionRequest = (payload: Record<string, unknown>, insurerId?: number) =>
  safeFetch(
    `${API_URL}/api/inspection-requests`,
    {
      method: 'POST',
      headers: defaultHeaders('INSURER', insurerId),
      body: JSON.stringify(payload),
    },
    null,
  );

export const saveInspectionReport = (id: number, payload: Record<string, unknown>, role: 'ALARA' | 'INSURER') =>
  safeFetch(
    `${API_URL}/api/inspection-requests/${id}/report`,
    {
      method: 'POST',
      headers: defaultHeaders(role),
      body: JSON.stringify(payload),
    },
    null,
  );

export const shareInspectionReport = (id: number, role: 'ALARA' | 'INSURER') =>
  safeFetch(
    `${API_URL}/api/inspection-requests/${id}/report/share`,
    {
      method: 'POST',
      headers: defaultHeaders(role),
    },
    null,
  );

export type PdfType = 'solicitud' | 'reporte';

export const downloadPdf = async (requestId: number, type: PdfType) => {
  const url = `${API_URL}/api/inspection-requests/${requestId}/pdf/${type}`;
  const token = localStorage.getItem('alara-token');
  const response = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error('No se pudo descargar el PDF');
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = type === 'reporte' ? 'reporte_inspeccion.pdf' : 'solicitud_inspeccion.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};

export const triggerInvestigation = (id: number, sources: { name: string; url: string }[] = []) =>
  safeFetch(
    `${API_URL}/api/inspection-requests/${id}/investigate`,
    {
      method: 'POST',
      headers: defaultHeaders('ALARA'),
      body: JSON.stringify({ sources }),
    },
    null,
  );

export const startInspectionCall = (id: number) =>
  safeFetch(
    `${API_URL}/api/inspection-requests/${id}/call/start`,
    {
      method: 'POST',
      headers: defaultHeaders('ALARA'),
    },
    null,
  );

export const getInvestigations = (id: number, role: 'ALARA' | 'INSURER') =>
  safeFetch(
    `${API_URL}/api/inspection-requests/${id}/investigations`,
    {
      headers: defaultHeaders(role),
    },
    [],
  );

export const getReportTemplate = (role: 'ALARA' | 'INSURER') =>
  safeFetch(
    `${API_URL}/api/inspection-requests/report-template/default`,
    { headers: defaultHeaders(role) },
    null,
  );

export type UpdateClientPayload = {
  first_name?: string;
  last_name?: string;
  dob?: string;
  id_type?: 'CEDULA' | 'PASSPORT' | 'OTRO';
  id_number?: string;
  email?: string;
  phone_mobile?: string;
  phone_home?: string;
  phone_work?: string;
  employer_name?: string;
  employer_tax_id?: string;
  profession?: string;
};

export const updateInspectionRequestClient = (
  id: number,
  payload: UpdateClientPayload,
  role: 'ALARA' | 'INSURER',
  insurerId?: number,
) =>
  safeFetch(
    `${API_URL}/api/inspection-requests/${id}/client`,
    {
      method: 'PATCH',
      headers: defaultHeaders(role, insurerId),
      body: JSON.stringify(payload),
    },
    null,
  );

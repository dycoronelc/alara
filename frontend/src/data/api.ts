import { mockAlaraDashboard, mockInsurerDashboard, mockRequests } from './mock';

declare global {
  interface Window {
    /** Inyectado en producción por `scripts/write-runtime-config.mjs` (Railway runtime). */
    __ALARA_API_BASE__?: string;
  }
}

/**
 * Orden: 1) runtime-config.js (npm start en Railway), 2) Vite en build (VITE_API_URL).
 * Así la URL del backend puede definirse solo en variables de runtime del servicio frontend.
 */
function readApiBaseFromEnv(): string {
  if (typeof window !== 'undefined' && window.__ALARA_API_BASE__) {
    return String(window.__ALARA_API_BASE__).trim();
  }
  return (import.meta.env.VITE_API_URL ?? '').trim();
}

/** Base del API sin barra final. Vacío = rutas relativas al mismo origen (solo válido si hay proxy). */
const normalizedBase = readApiBaseFromEnv().replace(/\/$/, '');

export const getApiUrl = () => normalizedBase;

/** Construye URL del API evitando dobles barras y soportando VITE_API_URL con o sin trailing slash. */
export function buildApiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!normalizedBase) return p;
  return `${normalizedBase}${p}`;
}

export type LoginSuccess = {
  access_token: string;
  user: { role: string; insurer_id?: number };
};

export type LoginResult =
  | { ok: true; data: LoginSuccess }
  | { ok: false; reason: 'network' | 'unauthorized' | 'bad_response' | 'invalid_json'; message: string };

/**
 * Login con parsing seguro: si el host del frontend devuelve 200 + HTML (SPA fallback),
 * se detecta y se indica configurar VITE_API_URL.
 */
export async function loginRequest(email: string, password: string): Promise<LoginResult> {
  let response: Response;
  try {
    response = await fetch(buildApiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return {
      ok: false,
      reason: 'network',
      message: 'No se pudo conectar con el servidor. Comprueba tu red y la URL del API.',
    };
  }

  const text = await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    const looksLikeHtml = /^\s*</.test(text);
    return {
      ok: false,
      reason: 'invalid_json',
      message: looksLikeHtml
        ? 'La respuesta no es JSON (probablemente el HTML del sitio). Define VITE_API_URL con la URL del backend al construir el frontend (p. ej. https://tu-api.railway.app).'
        : 'El servidor devolvió una respuesta que no se pudo interpretar.',
    };
  }

  if (!response.ok) {
    const msg =
      body && typeof body === 'object' && body !== null && 'message' in body
        ? String((body as { message: unknown }).message)
        : 'Credenciales inválidas';
    return { ok: false, reason: 'unauthorized', message: msg };
  }

  const data = body as Partial<LoginSuccess>;
  if (typeof data?.access_token !== 'string' || !data?.user || typeof data.user.role !== 'string') {
    return {
      ok: false,
      reason: 'bad_response',
      message:
        'El servidor respondió 200 pero sin token de acceso. Suele pasar si la petición no llega al API Nest (revisa VITE_API_URL y CORS).',
    };
  }

  return { ok: true, data: data as LoginSuccess };
}

/** @deprecated Prefer loginRequest para mensajes de error claros */
export const login = (email: string, password: string) =>
  fetch(buildApiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

export type ForgotPasswordResponse = { ok: true; debug_reset_token?: string };

export const forgotPassword = (email: string) =>
  fetch(buildApiUrl('/api/auth/forgot-password'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

export const resetPassword = (token: string, newPassword: string) =>
  fetch(buildApiUrl('/api/auth/reset-password'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, new_password: newPassword }),
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
  safeFetch(buildApiUrl('/api/dashboard/insurer'), { headers: defaultHeaders('INSURER', insurerId) }, mockInsurerDashboard);

export const getAlaraDashboard = () =>
  safeFetch(buildApiUrl('/api/dashboard/alara'), { headers: defaultHeaders('ALARA') }, mockAlaraDashboard);

export const getInspectionRequests = (role: 'INSURER' | 'ALARA', insurerId?: number) =>
  safeFetch(
    buildApiUrl('/api/inspection-requests'),
    { headers: defaultHeaders(role, insurerId) },
    mockRequests,
  );

export const getInspectionRequest = (id: number, role: 'INSURER' | 'ALARA', insurerId?: number) =>
  safeFetch(buildApiUrl(`/api/inspection-requests/${id}`), { headers: defaultHeaders(role, insurerId) }, null);

export const createInspectionRequest = (payload: Record<string, unknown>, insurerId?: number) =>
  safeFetch(
    buildApiUrl('/api/inspection-requests'),
    {
      method: 'POST',
      headers: defaultHeaders('INSURER', insurerId),
      body: JSON.stringify(payload),
    },
    null,
  );

export const saveInspectionReport = (id: number, payload: Record<string, unknown>, role: 'ALARA' | 'INSURER') =>
  safeFetch(
    buildApiUrl(`/api/inspection-requests/${id}/report`),
    {
      method: 'POST',
      headers: defaultHeaders(role),
      body: JSON.stringify(payload),
    },
    null,
  );

export const shareInspectionReport = (id: number, role: 'ALARA' | 'INSURER') =>
  safeFetch(
    buildApiUrl(`/api/inspection-requests/${id}/report/share`),
    {
      method: 'POST',
      headers: defaultHeaders(role),
    },
    null,
  );

export type PdfType = 'solicitud' | 'reporte';

export const downloadPdf = async (requestId: number, type: PdfType) => {
  const url = buildApiUrl(`/api/inspection-requests/${requestId}/pdf/${type}`);
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
    buildApiUrl(`/api/inspection-requests/${id}/investigate`),
    {
      method: 'POST',
      headers: defaultHeaders('ALARA'),
      body: JSON.stringify({ sources }),
    },
    null,
  );

export const startInspectionCall = (id: number) =>
  safeFetch(
    buildApiUrl(`/api/inspection-requests/${id}/call/start`),
    {
      method: 'POST',
      headers: defaultHeaders('ALARA'),
    },
    null,
  );

export const getInvestigations = (id: number, role: 'ALARA' | 'INSURER') =>
  safeFetch(
    buildApiUrl(`/api/inspection-requests/${id}/investigations`),
    {
      headers: defaultHeaders(role),
    },
    [],
  );

export const getReportTemplate = (role: 'ALARA' | 'INSURER') =>
  safeFetch(
    buildApiUrl('/api/inspection-requests/report-template/default'),
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
    buildApiUrl(`/api/inspection-requests/${id}/client`),
    {
      method: 'PATCH',
      headers: defaultHeaders(role, insurerId),
      body: JSON.stringify(payload),
    },
    null,
  );

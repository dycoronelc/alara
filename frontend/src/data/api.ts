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

export type SessionUser = {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  insurer_id?: number;
  alara_office_id?: number;
  roles?: { code: string; name: string }[];
  role_codes?: string[];
};

export type LoginSuccess = {
  access_token: string;
  user: SessionUser;
};

export type ApiRole = 'INSURER' | 'ALARA' | 'ADMIN' | 'BROKER';

export function getStoredRole(): ApiRole {
  const raw = localStorage.getItem('alara-role');
  const r = raw?.trim();
  if (r === 'INSURER' || r === 'ALARA' || r === 'ADMIN' || r === 'BROKER') return r;
  if (r === 'INSURER_USER') return 'INSURER';
  if (r === 'BROKER_USER') return 'BROKER';
  return 'ALARA';
}

/** true si la ruta es del portal aseguradoras (case-insensitive; admite subpath tipo /app/portal/aseguradora/...). */
export function isAseguradoraPortalPath(pathname?: string): boolean {
  const p = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');
  if (!p) return false;
  return /(^|\/)portal\/aseguradora(\/|$)/i.test(p);
}

/** Rol del JWT de acceso (sin verificar firma; solo para UI). */
export function getRoleFromAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('alara-token');
  if (!token) return null;
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (b64.length % 4)) % 4);
    const json = atob(b64 + pad);
    const payload = JSON.parse(json) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

/**
 * Vista restringida tipo aseguradora: URL /portal/aseguradora, prop, rol en JWT o localStorage.
 * Pasa `pathname` desde useLocation() para que React recalcule al navegar.
 */
export function isInsurerExperienceMode(portal: 'aseguradora' | 'alara', pathname?: string): boolean {
  if (isAseguradoraPortalPath(pathname)) return true;
  if (portal === 'aseguradora') return true;
  const jwtRole = getRoleFromAccessToken();
  if (jwtRole === 'INSURER' || jwtRole === 'BROKER') return true;
  const r = getStoredRole();
  if (r === 'INSURER' || r === 'BROKER') return true;
  try {
    const raw = localStorage.getItem('alara-user');
    if (!raw) return false;
    const u = JSON.parse(raw) as { role?: string; role_codes?: string[] };
    if (u.role === 'INSURER' || u.role === 'BROKER') return true;
    if (Array.isArray(u.role_codes)) {
      return u.role_codes.some((c) =>
        ['INSURER', 'INSURER_USER', 'BROKER', 'BROKER_USER'].includes(c),
      );
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function getApiRoleForPortal(portal: 'aseguradora' | 'alara'): ApiRole {
  const r = getStoredRole();
  if (portal === 'aseguradora') {
    return r === 'BROKER' ? 'BROKER' : 'INSURER';
  }
  return r === 'ADMIN' ? 'ADMIN' : 'ALARA';
}

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

function getStoredUserId(): string {
  return localStorage.getItem('alara-user-id') || '0';
}

const defaultHeaders = (role?: ApiRole, insurerId?: number) => {
  const token = localStorage.getItem('alara-token');
  const effectiveRole = role ?? getStoredRole();
  const effectiveInsurerId = insurerId ?? getStoredInsurerId();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'x-user-role': effectiveRole,
    'x-user-id': getStoredUserId(),
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
  safeFetch(
    buildApiUrl('/api/dashboard/insurer'),
    { headers: defaultHeaders(getApiRoleForPortal('aseguradora'), insurerId) },
    mockInsurerDashboard,
  );

export const getAlaraDashboard = () =>
  safeFetch(buildApiUrl('/api/dashboard/alara'), { headers: defaultHeaders(getApiRoleForPortal('alara')) }, mockAlaraDashboard);

export type InspectionServiceTypeOption = {
  id: number;
  name: string;
  sort_order: number;
};

/** Catálogo de tipos de servicio (solicitud de inspección). */
export const getInspectionServiceTypes = (insurerId?: number) =>
  safeFetch<InspectionServiceTypeOption[]>(
    buildApiUrl('/api/inspection-requests/service-types'),
    { headers: defaultHeaders(getApiRoleForPortal('aseguradora'), insurerId) },
    [],
  );

export const getInspectionRequests = (portal: 'aseguradora' | 'alara', insurerId?: number) =>
  safeFetch(
    buildApiUrl('/api/inspection-requests'),
    { headers: defaultHeaders(getApiRoleForPortal(portal), insurerId) },
    mockRequests,
  );

export const getInspectionRequest = (
  id: number,
  portal: 'aseguradora' | 'alara',
  insurerId?: number,
) =>
  safeFetch(buildApiUrl(`/api/inspection-requests/${id}`), { headers: defaultHeaders(getApiRoleForPortal(portal), insurerId) }, null);

export type RequestDocument = {
  id: number | string;
  doc_type: string;
  filename: string;
  mime_type: string;
  file_size_bytes: number | string;
  storage_provider: string;
  uploaded_at: string;
};

export const getInspectionRequestDocuments = (
  id: number,
  portal: 'aseguradora' | 'alara',
  insurerId?: number,
) =>
  safeFetch<RequestDocument[]>(
    buildApiUrl(`/api/inspection-requests/${id}/documents`),
    { headers: defaultHeaders(getApiRoleForPortal(portal), insurerId) },
    [],
  );

/** Solo rol ADMIN en el API. Elimina el registro y el archivo en almacenamiento local si aplica. */
export async function deleteInspectionRequestDocument(
  requestId: number,
  documentId: number,
  portal: 'aseguradora' | 'alara',
  insurerId?: number,
): Promise<void> {
  const token = localStorage.getItem('alara-token');
  const effectiveInsurerId = insurerId ?? getStoredInsurerId();
  const role = getApiRoleForPortal(portal);
  const url = buildApiUrl(`/api/inspection-requests/${requestId}/documents/${documentId}`);
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-user-role': role,
      'x-user-id': getStoredUserId(),
      ...(effectiveInsurerId ? { 'x-insurer-id': String(effectiveInsurerId) } : {}),
    },
  });
  if (!response.ok) {
    let msg = 'No se pudo eliminar el documento';
    try {
      const body = (await response.json()) as { message?: unknown };
      if (body?.message != null) msg = String(body.message);
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
}

/** Abre el documento almacenado (PDF, etc.) en una pestaña nueva; requiere JWT. */
export async function openInspectionRequestDocument(
  requestId: number,
  documentId: number,
  portal: 'aseguradora' | 'alara',
  insurerId?: number,
): Promise<void> {
  const token = localStorage.getItem('alara-token');
  const effectiveInsurerId = insurerId ?? getStoredInsurerId();
  const role = getApiRoleForPortal(portal);
  const url = buildApiUrl(`/api/inspection-requests/${requestId}/documents/${documentId}/file`);
  const response = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-user-role': role,
      'x-user-id': getStoredUserId(),
      ...(effectiveInsurerId ? { 'x-insurer-id': String(effectiveInsurerId) } : {}),
    },
  });
  if (!response.ok) {
    throw new Error('No se pudo abrir el documento');
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
}

export const createInspectionRequest = (payload: Record<string, unknown>, insurerId?: number) =>
  safeFetch<{ id: number }>(
    buildApiUrl('/api/inspection-requests'),
    {
      method: 'POST',
      headers: defaultHeaders(getApiRoleForPortal('aseguradora'), insurerId),
      body: JSON.stringify(payload),
    },
  );

/** Sube un adjunto a una solicitud ya creada (PDF o imagen, máx. 10 MB). */
export async function uploadInspectionRequestDocument(
  requestId: number,
  file: File,
  docType: string,
  insurerId?: number,
): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('doc_type', docType);
  const token = localStorage.getItem('alara-token');
  const effectiveInsurerId = insurerId ?? getStoredInsurerId();
  const response = await fetch(buildApiUrl(`/api/inspection-requests/${requestId}/documents/upload`), {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-user-role': getApiRoleForPortal('aseguradora'),
      'x-user-id': getStoredUserId(),
      ...(effectiveInsurerId ? { 'x-insurer-id': String(effectiveInsurerId) } : {}),
    },
    body: formData,
  });
  if (!response.ok) {
    let detail = 'No se pudo subir el archivo';
    try {
      const j = (await response.json()) as { message?: string | string[] };
      if (typeof j.message === 'string') detail = j.message;
      else if (Array.isArray(j.message)) detail = j.message.join(', ');
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
}

export const updateInspectionRequestStatus = (
  id: number,
  payload: {
    new_status: string;
    scheduled_start_at?: string;
    scheduled_end_at?: string;
    note?: string;
    cancellation_reason?: string;
  },
  portal: 'aseguradora' | 'alara',
  insurerId?: number,
) =>
  safeFetch(
    buildApiUrl(`/api/inspection-requests/${id}/status`),
    {
      method: 'POST',
      headers: defaultHeaders(getApiRoleForPortal(portal), insurerId),
      body: JSON.stringify(payload),
    },
    null,
  );

export const saveInspectionReport = (
  id: number,
  payload: Record<string, unknown>,
  portal: 'aseguradora' | 'alara',
) =>
  safeFetch(
    buildApiUrl(`/api/inspection-requests/${id}/report`),
    {
      method: 'POST',
      headers: defaultHeaders(getApiRoleForPortal(portal)),
      body: JSON.stringify(payload),
    },
    null,
  );

export const shareInspectionReport = (id: number, portal: 'aseguradora' | 'alara') =>
  safeFetch(
    buildApiUrl(`/api/inspection-requests/${id}/report/share`),
    {
      method: 'POST',
      headers: defaultHeaders(getApiRoleForPortal(portal)),
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
      headers: defaultHeaders(getApiRoleForPortal('alara')),
      body: JSON.stringify({ sources }),
    },
    null,
  );

export const startInspectionCall = (id: number) =>
  safeFetch(
    buildApiUrl(`/api/inspection-requests/${id}/call/start`),
    {
      method: 'POST',
      headers: defaultHeaders(getApiRoleForPortal('alara')),
    },
    null,
  );

export const getInvestigations = (id: number, portal: 'aseguradora' | 'alara') =>
  safeFetch(
    buildApiUrl(`/api/inspection-requests/${id}/investigations`),
    {
      headers: defaultHeaders(getApiRoleForPortal(portal)),
    },
    [],
  );

export const getReportTemplate = (portal: 'aseguradora' | 'alara') =>
  safeFetch(
    buildApiUrl('/api/inspection-requests/report-template/default'),
    { headers: defaultHeaders(getApiRoleForPortal(portal)) },
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
  address_line?: string;
  city?: string;
  country?: string;
  employer_name?: string;
  employer_tax_id?: string;
  profession?: string;
};

export const updateInspectionRequestClient = (
  id: number,
  payload: UpdateClientPayload,
  portal: 'aseguradora' | 'alara',
  insurerId?: number,
) =>
  safeFetch(
    buildApiUrl(`/api/inspection-requests/${id}/client`),
    {
      method: 'PATCH',
      headers: defaultHeaders(getApiRoleForPortal(portal), insurerId),
      body: JSON.stringify(payload),
    },
    null,
  );

export type RoleRow = { id: string | number; code: string; name: string };

export const fetchRoles = () =>
  safeFetch<RoleRow[]>(buildApiUrl('/api/roles'), { headers: defaultHeaders() }, []);

export type UserRow = {
  id: number;
  email: string;
  phone: string;
  full_name: string;
  user_type: string;
  is_active: boolean;
  insurer: { id: number; name: string } | null;
  alara_office?: { id: number; name: string } | null;
  roles: { code: string; name: string }[];
};

export const fetchUsers = () =>
  safeFetch<UserRow[]>(buildApiUrl('/api/users'), { headers: defaultHeaders() }, []);

export type InsurerOption = { id: string | number; name: string };

export const fetchInsurersForAdmin = () =>
  safeFetch<InsurerOption[]>(buildApiUrl('/api/insurers'), { headers: defaultHeaders() }, []);

export const createUserAdmin = (payload: Record<string, unknown>) =>
  safeFetch(
    buildApiUrl('/api/users'),
    {
      method: 'POST',
      headers: defaultHeaders(),
      body: JSON.stringify(payload),
    },
    null,
  );

export const updateUserAdmin = (id: number, payload: Record<string, unknown>) =>
  safeFetch<UserRow>(buildApiUrl(`/api/users/${id}`), {
    method: 'PATCH',
    headers: defaultHeaders(),
    body: JSON.stringify(payload),
  });

export const deleteUserAdmin = (id: number) =>
  safeFetch<UserRow>(buildApiUrl(`/api/users/${id}`), {
    method: 'DELETE',
    headers: defaultHeaders(),
  });

export const updateRoleAdmin = (id: number | string, payload: { name: string }) =>
  safeFetch<RoleRow>(buildApiUrl(`/api/roles/${id}`), {
    method: 'PATCH',
    headers: defaultHeaders(),
    body: JSON.stringify(payload),
  });

export async function deleteRoleAdmin(id: number | string): Promise<void> {
  const response = await fetch(buildApiUrl(`/api/roles/${id}`), {
    method: 'DELETE',
    headers: defaultHeaders(),
  });
  if (!response.ok) {
    let msg = 'No se pudo eliminar el rol';
    try {
      const j = (await response.json()) as { message?: unknown };
      if (j?.message) msg = String(j.message);
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
}

/** dd/mm/aaaa estricto */
const DDMMYYYY = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export function isValidDdMmYyyy(s: string): boolean {
  const m = s.trim().match(DDMMYYYY);
  if (!m) return false;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return false;
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
}

/** Convierte ISO yyyy-mm-dd (o fecha del API) a dd/mm/yyyy para mostrar en el reporte */
export function isoLikeToDdMmYyyy(iso: string | undefined | null): string {
  if (!iso) return '';
  const s = String(iso).trim();
  const ymd = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    const [y, m, d] = ymd.split('-');
    return `${d}/${m}/${y}`;
  }
  if (isValidDdMmYyyy(s)) return s;
  return s;
}

/** Normaliza entrada mientras el usuario escribe (solo dígitos y barras, máx 10 chars) */
export function normalizeDdMmYyyyInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Convierte dd/mm/aaaa válido a yyyy-mm-dd (API / input type date). */
export function ddMmYyyyToIso(s: string): string | null {
  const t = s.trim();
  if (!isValidDdMmYyyy(t)) return null;
  const m = t.match(DDMMYYYY)!;
  const d = m[1];
  const mo = m[2];
  const y = m[3];
  return `${y}-${mo}-${d}`;
}

/**
 * Fecha local (dd/mm/aaaa) + hora (HH:mm de input type="time") → ISO UTC.
 * Retorna null si la fecha no es válida o la hora no tiene formato HH:mm.
 */
export function ddMmYyyyAndTimeToIso(dateDdMmYyyy: string, timeHHmm: string): string | null {
  const isoDate = ddMmYyyyToIso(dateDdMmYyyy.trim());
  if (!isoDate) return null;
  const [yS, moS, dS] = isoDate.split('-');
  const y = Number(yS);
  const mo = Number(moS);
  const d = Number(dS);
  const tm = timeHHmm.trim();
  const parts = tm.split(':');
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const min = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return null;
  }
  return new Date(y, mo - 1, d, h, min, 0, 0).toISOString();
}

/** Edad en años cumplidos a la fecha de hoy. */
export function ageInYearsFromDdMmYyyy(s: string): number | null {
  if (!isValidDdMmYyyy(s)) return null;
  const m = s.trim().match(DDMMYYYY)!;
  const day = Number(m[1]);
  const month = Number(m[2]) - 1;
  const year = Number(m[3]);
  const birth = new Date(year, month, day);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const md = today.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

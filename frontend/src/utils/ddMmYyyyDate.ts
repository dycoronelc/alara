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

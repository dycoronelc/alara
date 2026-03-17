/**
 * Valida formato de cédula de Panamá.
 * Patrones: Regular (1-1234-12345), PE, E, N, PI, AV.
 */
const PANAMA_CEDULA_REGEX =
  /^(\d{1,2}-\d{1,4}-\d{1,5}|PE-\d{1,4}-\d{1,5}|E-\d{1,4}-\d{1,6}|N-\d{1,4}-\d{1,4}|\d{1,2}PI-\d{1,4}-\d{1,5}|\d{1,2}AV-\d{1,4}-\d{1,5})$/i;

export function isPanamaCedula(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return PANAMA_CEDULA_REGEX.test(value.trim());
}

export const PANAMA_CEDULA_HINT =
  'Ejemplos: 1-1234-12345, PE-1234-12345, E-8-157481, N-1234-1234, 1PI-1234-12345, 1AV-1234-12345';

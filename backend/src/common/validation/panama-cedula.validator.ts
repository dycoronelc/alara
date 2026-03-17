import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Patrones de cédula de Panamá aceptados:
 * - Regular: 1-1234-12345 (Provincia-Tomo-Asiento)
 * - Panameño Nacido en el Extranjero: PE-1234-12345
 * - Extranjero con Cédula: E-1234-123456
 * - Naturalizado: N-1234-1234
 * - Población Indígena: 1PI-1234-12345
 * - Antiguos (antes de 1995): 1AV-1234-12345
 */
const PANAMA_CEDULA_REGEX =
  /^(\d{1,2}-\d{1,4}-\d{1,5}|PE-\d{1,4}-\d{1,5}|E-\d{1,4}-\d{1,6}|N-\d{1,4}-\d{1,4}|\d{1,2}PI-\d{1,4}-\d{1,5}|\d{1,2}AV-\d{1,4}-\d{1,5})$/i;

export function IsPanamaCedula(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPanamaCedula',
      target: object.constructor,
      propertyName,
      options: validationOptions ?? {
        message:
          'El número de cédula no cumple un formato válido de Panamá. Ejemplos: 1-1234-12345, PE-1234-12345, E-8-157481, N-1234-1234, 1PI-1234-12345, 1AV-1234-12345',
      },
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (value == null || value === '') return true;
          const s = String(value).trim();
          return PANAMA_CEDULA_REGEX.test(s);
        },
      },
    });
  };
}

export function isPanamaCedulaFormat(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return PANAMA_CEDULA_REGEX.test(value.trim());
}

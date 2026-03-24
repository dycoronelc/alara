export type ReportFieldUiType = 'text' | 'textarea' | 'select' | 'yes_no' | 'date';

export type ReportFieldOption = { value: string; label: string };

export type ReportFieldDef = {
  key: string;
  label: string;
  type?: ReportFieldUiType;
  options?: ReportFieldOption[];
  /** Si se define, el campo solo se muestra cuando `key` tiene uno de `values` (p. ej. Sí/No). */
  visibleWhen?: { key: string; values: string[] };
};

/** Claves obsoletas en plantillas remotas que ya no deben añadirse al fusionar. */
export const DEPRECATED_REPORT_FIELD_KEYS = new Set<string>([
  'last_checkup',
  'pa_name',
  'document',
]);

export function isReportFieldVisible(field: ReportFieldDef, values: Record<string, string>): boolean {
  if (!field.visibleWhen) return true;
  const v = (values[field.visibleWhen.key] ?? '').trim();
  return field.visibleWhen.values.includes(v);
}

export type ReportSectionDef = { code?: string; title: string; fields: ReportFieldDef[] };

export const MARITAL_STATUS_OPTIONS: ReportFieldOption[] = [
  { value: 'Soltero', label: 'Soltero' },
  { value: 'Casado', label: 'Casado' },
  { value: 'Divorciado', label: 'Divorciado' },
  { value: 'Viudo', label: 'Viudo' },
  { value: 'Unido', label: 'Unido' },
  { value: 'Otro', label: 'Otro' },
];

/** Mismos valores que la solicitud / Prisma IdType */
export const ID_TYPE_REPORT_OPTIONS: ReportFieldOption[] = [
  { value: 'CEDULA', label: 'Cédula' },
  { value: 'PASSPORT', label: 'Pasaporte' },
  { value: 'OTRO', label: 'Otro' },
];

export const EMPLOYEE_OR_PARTNER_OPTIONS: ReportFieldOption[] = [
  { value: 'Empleado', label: 'Empleado' },
  { value: 'Socio', label: 'Socio' },
];

export const SI_NO_OPTIONS: ReportFieldOption[] = [
  { value: 'Sí', label: 'Sí' },
  { value: 'No', label: 'No' },
];

/** Claves que siempre son Sí/No aunque el API aún diga TEXT (plantillas antiguas) */
export const YES_NO_KEYS = new Set<string>([
  'deafness',
  'blindness',
  'physical_alterations',
  'amputations',
  'other_impediments',
  'high_pressure',
  'diabetes',
  'cancer',
  'cardiac',
  'ulcer',
  'work_risk',
  'safety_rules',
  'diving',
  'racing',
  'pilot',
  'ultralight',
  'parachute',
  'paragliding',
  'climbing',
  'smoker',
  'vape',
  'alcohol',
  'marijuana',
  'amphetamines',
  'barbiturics',
  'cocaine',
  'lsd',
  'stimulants',
  'other_drugs',
  'treatment',
  'pep',
  'political_party',
  'kidnapping',
  'armored_car',
  'weapons',
  'weapon_fired',
  'weapon_training',
  'military',
  'accidents_security',
  'personal_guard',
  'previous_rejected',
  'replaces_policy',
  'bankruptcy',
  'criminal_case',
  'civil_case',
  'commercial_case',
  'labor_case',
  'accidents',
]);

/** Campos multilínea aunque el API antiguo guarde type TEXT */
export const TEXTAREA_KEYS = new Set<string>([
  'foreign_residence',
  'functions',
  'studies',
  'results',
  'surgeries',
  'important_diseases',
  'prescribed_meds',
  'non_prescribed_meds',
  'work_risk_desc',
  'other_risk',
  'accidents_detail',
  'sports_details',
  'vape_details',
  'treatment_detail',
  'pep_detail',
  'political_party_detail',
  'weapon_training_detail',
  'military_detail',
  'insurance_reason',
  'simultaneous_policy',
  'funds_origin',
  'consultation_reason',
  'previous_rejection_reason',
  'earned_concept',
  'unearned_concept',
  'goods',
  'other_assets',
  'negative_history',
  'dui',
  'traffic',
  'arrested',
  'additional_comments',
]);

export const DATE_KEYS = new Set<string>([
  'dob',
  'company_start',
  'last_consult',
  'tobacco_last',
  'insurance_date',
]);

const SELECT_BY_KEY: Record<string, ReportFieldOption[]> = {
  marital_status: MARITAL_STATUS_OPTIONS,
  employee_or_partner: EMPLOYEE_OR_PARTNER_OPTIONS,
  id_type: ID_TYPE_REPORT_OPTIONS,
};

export function mapApiFieldToDef(field: {
  key: string;
  label: string;
  type?: string;
  options?: ReportFieldOption[];
}): ReportFieldDef {
  const t = (field.type ?? 'TEXT').toUpperCase();
  const key = field.key;

  if (t === 'TEXTAREA' || t === 'TEXT_AREA') {
    return { key, label: field.label, type: 'textarea' };
  }
  if (t === 'BOOL' || t === 'YES_NO' || t === 'SI_NO') {
    return { key, label: field.label, type: 'yes_no' };
  }
  if (t === 'DATE' || t === 'DATE_DDMMYYYY') {
    return { key, label: field.label, type: 'date' };
  }
  if (t === 'SELECT' || t === 'ENUM') {
    return {
      key,
      label: field.label,
      type: 'select',
      options: field.options?.length ? field.options : SELECT_BY_KEY[key] ?? [],
    };
  }

  if (SELECT_BY_KEY[key]) {
    return { key, label: field.label, type: 'select', options: SELECT_BY_KEY[key] };
  }
  if (YES_NO_KEYS.has(key)) {
    return { key, label: field.label, type: 'yes_no' };
  }
  if (DATE_KEYS.has(key)) {
    return { key, label: field.label, type: 'date' };
  }
  if (TEXTAREA_KEYS.has(key)) {
    return { key, label: field.label, type: 'textarea' };
  }

  return { key, label: field.label, type: 'text' };
}

/** Valores del enum `ReportFieldType` en Prisma (backend). */
export function toApiFieldType(field: ReportFieldDef): string {
  switch (field.type) {
    case 'textarea':
      return 'TEXT';
    case 'select':
      return 'ENUM';
    case 'yes_no':
      return 'BOOL';
    case 'date':
      return 'DATE';
    default:
      return 'TEXT';
  }
}

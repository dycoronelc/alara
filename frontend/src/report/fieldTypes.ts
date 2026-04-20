export type ReportFieldUiType = 'text' | 'textarea' | 'select' | 'yes_no' | 'date';

export type ReportFieldOption = { value: string; label: string };

export type ReportFieldDef = {
  key: string;
  label: string;
  type?: ReportFieldUiType;
  options?: ReportFieldOption[];
  /** Si se define, el campo solo se muestra cuando `key` tiene uno de `values` (p. ej. Sí/No). */
  visibleWhen?: { key: string; values: string[] };
  /** Si se define, el campo se muestra cuando **alguna** de las claves tiene uno de `values` (OR). */
  visibleWhenAny?: { keys: string[]; values: string[] };
};

/** Claves obsoletas en plantillas remotas que ya no deben añadirse al fusionar. */
export const DEPRECATED_REPORT_FIELD_KEYS = new Set<string>([
  'last_checkup',
  'pa_name',
  'document',
]);

export function isReportFieldVisible(field: ReportFieldDef, values: Record<string, string>): boolean {
  if (field.visibleWhenAny) {
    const { keys, values: allowed } = field.visibleWhenAny;
    return keys.some((k) => allowed.includes((values[k] ?? '').trim()));
  }
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

export const WEIGHT_UNIT_OPTIONS: ReportFieldOption[] = [
  { value: 'kg', label: 'kg' },
  { value: 'lbs', label: 'lbs' },
];

export const HEIGHT_UNIT_OPTIONS: ReportFieldOption[] = [
  { value: 'cm', label: 'cm' },
  { value: 'ft', label: 'ft' },
];

export const SI_NO_OPTIONS: ReportFieldOption[] = [
  { value: 'Sí', label: 'Sí' },
  { value: 'No', label: 'No' },
];

/** Opciones de un select son exactamente Sí / No (mismo valor). */
export function isSiNoOptionList(opts: ReportFieldOption[] | undefined): boolean {
  if (!opts || opts.length !== 2) return false;
  const vals = new Set(opts.map((o) => String(o.value)));
  return vals.has('Sí') && vals.has('No');
}

/**
 * Valor persistido → "Sí" solo si quedó explícitamente afirmativo; en cualquier otro caso (vacío, "No", etc.) → "No".
 */
export function resolvedYesNoStoredValue(v: string | undefined | null): 'Sí' | 'No' {
  const t = (v ?? '').trim();
  if (!t) return 'No';
  const lower = t.toLowerCase();
  if (t === 'Sí' || lower === 'sí' || lower === 'si' || t === 'TRUE' || lower === 'true' || t === '1') {
    return 'Sí';
  }
  return 'No';
}

export function fieldIsSiNoSelector(field: ReportFieldDef): boolean {
  if (field.type === 'yes_no') return true;
  if (field.type === 'select') return isSiNoOptionList(field.options);
  return false;
}

export function applySiNoDefaultsFromSections(
  values: Record<string, string>,
  sections: ReportSectionDef[],
): Record<string, string> {
  const next = { ...values };
  for (const section of sections) {
    for (const field of section.fields) {
      if (fieldIsSiNoSelector(field)) {
        next[field.key] = resolvedYesNoStoredValue(next[field.key]);
      }
    }
  }
  return next;
}

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
  'informacion_medica',
  'salud_detalle_respuesta_afirmativa',
  'riesgos_laborales_detalle_respuesta_afirmativa',
  'deportes_riesgo_detalle_respuesta_afirmativa',
  'alcohol_drogas_detalle_respuesta_afirmativa',
  'seguridad_detalle_respuesta_afirmativa',
  'juicios_detalle_respuesta_afirmativa',
  'informacion_complementaria',
]);

const SI_VALUES = ['Sí'] as const;

/** Texto del formulario impreso ALARA INSP (PDF de referencia). */
export const AFFIRMATIVE_DETAIL_LABEL = 'Por favor, ampliar las respuestas afirmativas:';

export const AFFIRMATIVE_YES_KEYS_SALUD = [
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
] as const;

export const AFFIRMATIVE_YES_KEYS_RIESGOS_LABORALES = ['work_risk', 'safety_rules'] as const;

export const AFFIRMATIVE_YES_KEYS_DEPORTES_RIESGO = [
  'diving',
  'racing',
  'pilot',
  'ultralight',
  'parachute',
  'paragliding',
  'climbing',
  'accidents',
] as const;

export const AFFIRMATIVE_YES_KEYS_ALCOHOL_DROGAS = [
  'alcohol',
  'marijuana',
  'amphetamines',
  'barbiturics',
  'cocaine',
  'lsd',
  'stimulants',
  'other_drugs',
  'treatment',
] as const;

export const AFFIRMATIVE_YES_KEYS_SEGURIDAD = [
  'kidnapping',
  'armored_car',
  'weapons',
  'weapon_fired',
  'weapon_training',
  'military',
  'accidents_security',
  'personal_guard',
] as const;

export const AFFIRMATIVE_YES_KEYS_JUICIOS = ['criminal_case', 'civil_case', 'commercial_case', 'labor_case'] as const;

/** Uso en `ReportFieldDef.visibleWhenAny` para mostrar detalle si alguna respuesta es Sí. */
export function visibleWhenAnySi(keys: readonly string[]): { keys: string[]; values: string[] } {
  return { keys: [...keys], values: [...SI_VALUES] };
}

/** Claves Sí/No por sección: si ninguna es «Sí», se limpia el detalle asociado. */
export const AFFIRMATIVE_DETAIL_FIELD_GROUPS: { detailKey: string; yesKeys: readonly string[] }[] = [
  { detailKey: 'salud_detalle_respuesta_afirmativa', yesKeys: AFFIRMATIVE_YES_KEYS_SALUD },
  { detailKey: 'riesgos_laborales_detalle_respuesta_afirmativa', yesKeys: AFFIRMATIVE_YES_KEYS_RIESGOS_LABORALES },
  { detailKey: 'deportes_riesgo_detalle_respuesta_afirmativa', yesKeys: AFFIRMATIVE_YES_KEYS_DEPORTES_RIESGO },
  { detailKey: 'alcohol_drogas_detalle_respuesta_afirmativa', yesKeys: AFFIRMATIVE_YES_KEYS_ALCOHOL_DROGAS },
  { detailKey: 'seguridad_detalle_respuesta_afirmativa', yesKeys: AFFIRMATIVE_YES_KEYS_SEGURIDAD },
  { detailKey: 'juicios_detalle_respuesta_afirmativa', yesKeys: AFFIRMATIVE_YES_KEYS_JUICIOS },
];

export function clearHiddenAffirmativeDetails(next: Record<string, string>): void {
  for (const { detailKey, yesKeys } of AFFIRMATIVE_DETAIL_FIELD_GROUPS) {
    const anySi = yesKeys.some((k) => (next[k] ?? '').trim() === 'Sí');
    if (!anySi) next[detailKey] = '';
  }
}

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
  weight_unit: WEIGHT_UNIT_OPTIONS,
  height_unit: HEIGHT_UNIT_OPTIONS,
};

/** Reglas de UI que el API de plantilla no envía (p. ej. cónyuge solo si Casado/Unido). */
export function applyReportFieldUiRules(def: ReportFieldDef): ReportFieldDef {
  if (def.key === 'spouse_name') {
    return { ...def, visibleWhen: { key: 'marital_status', values: ['Casado', 'Unido'] } };
  }
  return def;
}

export function mapApiFieldToDef(field: {
  key: string;
  label: string;
  type?: string;
  options?: ReportFieldOption[];
}): ReportFieldDef {
  const t = (field.type ?? 'TEXT').toUpperCase();
  const key = field.key;

  if (t === 'TEXTAREA' || t === 'TEXT_AREA') {
    return applyReportFieldUiRules({ key, label: field.label, type: 'textarea' });
  }
  if (t === 'BOOL' || t === 'YES_NO' || t === 'SI_NO') {
    return applyReportFieldUiRules({ key, label: field.label, type: 'yes_no' });
  }
  if (t === 'DATE' || t === 'DATE_DDMMYYYY') {
    return applyReportFieldUiRules({ key, label: field.label, type: 'date' });
  }
  if (t === 'SELECT' || t === 'ENUM') {
    return applyReportFieldUiRules({
      key,
      label: field.label,
      type: 'select',
      options: field.options?.length ? field.options : SELECT_BY_KEY[key] ?? [],
    });
  }

  if (SELECT_BY_KEY[key]) {
    return applyReportFieldUiRules({ key, label: field.label, type: 'select', options: SELECT_BY_KEY[key] });
  }
  if (YES_NO_KEYS.has(key)) {
    return applyReportFieldUiRules({ key, label: field.label, type: 'yes_no' });
  }
  if (DATE_KEYS.has(key)) {
    return applyReportFieldUiRules({ key, label: field.label, type: 'date' });
  }
  if (TEXTAREA_KEYS.has(key)) {
    return applyReportFieldUiRules({ key, label: field.label, type: 'textarea' });
  }

  return applyReportFieldUiRules({ key, label: field.label, type: 'text' });
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

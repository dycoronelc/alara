import type { ReportFieldDef } from '../report/fieldTypes';
import {
  EMPLOYEE_OR_PARTNER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  SI_NO_OPTIONS,
} from '../report/fieldTypes';
import { isValidDdMmYyyy, normalizeDdMmYyyyInput } from '../utils/ddMmYyyyDate';

type Props = {
  field: ReportFieldDef;
  value: string;
  onChange: (key: string, value: string) => void;
};

function optionsForSelect(field: ReportFieldDef) {
  if (field.options?.length) return field.options;
  if (field.key === 'marital_status') return MARITAL_STATUS_OPTIONS;
  if (field.key === 'employee_or_partner') return EMPLOYEE_OR_PARTNER_OPTIONS;
  return [];
}

export default function ReportFormField({ field, value, onChange }: Props) {
  const t = field.type ?? 'text';

  if (t === 'textarea') {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(field.key, e.target.value)}
        rows={3}
        aria-label={field.label}
      />
    );
  }

  if (t === 'yes_no') {
    return (
      <select value={value} onChange={(e) => onChange(field.key, e.target.value)} aria-label={field.label}>
        <option value="">Seleccione…</option>
        {SI_NO_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  if (t === 'select') {
    const opts = optionsForSelect(field);
    return (
      <select value={value} onChange={(e) => onChange(field.key, e.target.value)} aria-label={field.label}>
        <option value="">Seleccione…</option>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  if (t === 'date') {
    const invalid = value.trim() !== '' && !isValidDdMmYyyy(value);
    return (
      <>
        <input
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/aaaa"
          maxLength={10}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(field.key, normalizeDdMmYyyyInput(e.target.value))}
          aria-invalid={invalid}
          aria-label={field.label}
        />
        {invalid ? <span className="field-error">Use formato dd/mm/aaaa</span> : null}
      </>
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(field.key, e.target.value)}
      aria-label={field.label}
    />
  );
}

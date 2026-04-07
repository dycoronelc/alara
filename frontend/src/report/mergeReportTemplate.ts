import { defaultReportSections } from './defaultReportSections';
import type { ReportFieldDef, ReportSectionDef } from './fieldTypes';
import { DEPRECATED_REPORT_FIELD_KEYS } from './fieldTypes';

/**
 * Combina la plantilla del API con la definición por código: mantiene orden/campos nuevos del default
 * y aplica etiquetas/tipos del remoto cuando exista la misma clave.
 */
export function mergeReportTemplate(remote: ReportSectionDef[] | undefined): ReportSectionDef[] {
  const base = defaultReportSections();
  if (!remote?.length) return base;

  return base.map((b) => {
    const r = remote.find((x) => x.code === b.code || x.title === b.title);
    if (!r) return b;

    const byKey = new Map<string, ReportFieldDef>();
    r.fields.forEach((f) => byKey.set(f.key, f));

    const mergedFields: ReportFieldDef[] = b.fields.map((defF) => {
      const remoteF = byKey.get(defF.key);
      if (!remoteF) return defF;
      return {
        ...defF,
        label: remoteF.label || defF.label,
        type: defF.type ?? remoteF.type,
        options: defF.options?.length ? defF.options : remoteF.options,
        visibleWhen: defF.visibleWhen ?? remoteF.visibleWhen,
        visibleWhenAny: defF.visibleWhenAny ?? remoteF.visibleWhenAny,
      };
    });

    const baseKeys = new Set(b.fields.map((f) => f.key));
    r.fields.forEach((f) => {
      if (!baseKeys.has(f.key) && !DEPRECATED_REPORT_FIELD_KEYS.has(f.key)) {
        mergedFields.push(f);
      }
    });

    return { ...b, code: b.code ?? r.code, title: b.title };
  });
}

/**
 * Reportes guardados con plantilla antigua (pa_name, document) → campos homologados con la solicitud.
 */
export function migrateLegacyDatosPersonales(values: Record<string, string>): void {
  const hasNewName = Boolean(values.first_name?.trim() || values.last_name?.trim());
  if (!hasNewName && values.pa_name?.trim()) {
    const parts = values.pa_name.trim().split(/\s+/).filter(Boolean);
    if (parts.length) {
      values.first_name = parts[0];
      values.last_name = parts.slice(1).join(' ');
    }
  }

  const hasNewDoc = Boolean(values.id_number?.trim());
  if (!hasNewDoc && values.document?.trim()) {
    const raw = values.document.trim();
    const upper = raw.toUpperCase();
    if (upper.startsWith('CEDULA') || upper.startsWith('CÉDULA')) {
      if (!values.id_type) values.id_type = 'CEDULA';
      values.id_number = raw.replace(/^C[EÉ]DULA\s*/i, '').trim();
    } else if (upper.startsWith('PASSPORT') || upper.startsWith('PASAPORTE')) {
      if (!values.id_type) values.id_type = 'PASSPORT';
      values.id_number = raw.replace(/^(PASSPORT|PASAPORTE)\s*/i, '').trim();
    } else if (upper.startsWith('OTRO')) {
      if (!values.id_type) values.id_type = 'OTRO';
      values.id_number = raw.replace(/^OTRO\s*/i, '').trim();
    } else {
      values.id_number = raw;
    }
  }

  delete values.pa_name;
  delete values.document;
}

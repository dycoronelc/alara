/**
 * Genera JSON de ejemplo para POST /api/inspection-requests/:id/report
 * Ejecutar: npx tsx tools/generate-report-payload.ts (desde la raíz del repo)
 */
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
import { defaultReportSections } from '../frontend/src/report/defaultReportSections';
import { toApiFieldType } from '../frontend/src/report/fieldTypes';

function sampleValue(field: { key: string; type?: string }) {
  const t = field.type ?? 'text';
  switch (t) {
    case 'date':
      return '15/06/1990';
    case 'yes_no':
      return 'No';
    case 'select':
      if (field.key === 'marital_status') return 'Casado';
      if (field.key === 'employee_or_partner') return 'Empleado';
      return 'Opción1';
    case 'textarea':
      return 'Texto simulado para prueba de guardado.';
    default:
      return `Valor simulado: ${field.key}`;
  }
}

const sections = defaultReportSections().map((s, index) => ({
  code: s.code ?? `SEC_${index}`,
  title: s.title,
  order: index,
  fields: s.fields.map((f) => ({
    key: f.key,
    label: f.label,
    type: toApiFieldType(f),
    value: sampleValue(f),
  })),
}));

const body = {
  outcome: 'FAVORABLE' as const,
  summary: 'Resumen ejecutivo simulado del reporte VIP.',
  additional_comments: 'Comentarios adicionales de prueba.',
  generate_report_pdf: true,
  sections,
};

const out = join(__dirname, '..', 'backend', 'docs', 'sample-report-save-payload.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(body, null, 2), 'utf8');
console.log('Escrito:', out);

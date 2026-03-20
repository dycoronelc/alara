# Payload de prueba para guardar reporte

El archivo `sample-report-save-payload.json` se genera desde la plantilla del frontend para incluir **todas** las secciones y campos.

## Regenerar el JSON

Desde la raíz del repositorio:

```bash
npx tsx tools/generate-report-payload.ts
```

## Probar contra el API

1. Obtén un token JWT (login como usuario ALARA).
2. Sustituye `:id` por el ID numérico de una solicitud existente.

```bash
curl -s -X POST "https://TU-API/api/inspection-requests/1/report" \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-user-role: ALARA" \
  -H "x-user-id: 1" \
  -d @backend/docs/sample-report-save-payload.json
```

**Nota:** Solo el rol **ALARA** puede guardar reportes (`ForbiddenException` para INSURER).

Los tipos de campo enviados coinciden con el enum Prisma `ReportFieldType`: `TEXT`, `DATE`, `BOOL`, `ENUM`, etc.

Las fechas en el formulario y en este JSON de ejemplo usan formato **dd/mm/aaaa**.

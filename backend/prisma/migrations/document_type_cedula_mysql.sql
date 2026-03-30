-- =============================================================================
-- Añade valor CEDULA al ENUM `documents.doc_type` (MySQL)
-- =============================================================================
-- Ejecutar en bases existentes donde el enum aún no incluye CEDULA.
-- Si ya está aplicado, el ALTER puede fallar; en ese caso omitir.
-- Tras aplicar: `npx prisma db pull` opcional, o seguir con schema Prisma actual.
-- =============================================================================

ALTER TABLE `documents` MODIFY COLUMN `doc_type` ENUM(
  'SOLICITUD_PDF',
  'REPORTE_PDF',
  'CEDULA',
  'AUTORIZACION',
  'INVESTIGACION',
  'EVIDENCIA',
  'OTRO'
) NOT NULL;

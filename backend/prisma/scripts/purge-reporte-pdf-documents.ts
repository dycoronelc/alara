/**
 * Elimina solo las filas de `documents` con doc_type REPORTE_PDF.
 * Los datos del reporte en `inspection_reports` / secciones / campos no se tocan.
 * La próxima vez que se genere o guarde el PDF del reporte (p. ej. «Guardar y Finalizar»
 * con generar PDF), se creará uno nuevo con el formato actual del código.
 *
 * Nota: no borra archivos en disco/S3; si necesitas liberar espacio, hazlo aparte usando storage_key.
 *
 * Uso (carpeta backend, con DATABASE_URL):
 *   PowerShell: $env:CONFIRM_PURGE_REPORTE_PDF='yes'; npm run prisma:purge-report-pdfs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (process.env.CONFIRM_PURGE_REPORTE_PDF !== 'yes') {
    console.error(
      'Cancelado. Solo se borran filas REPORTE_PDF en la tabla documents; los reportes en BD se conservan.\n' +
        'Para ejecutar: CONFIRM_PURGE_REPORTE_PDF=yes npm run prisma:purge-report-pdfs\n' +
        'PowerShell: $env:CONFIRM_PURGE_REPORTE_PDF=\'yes\'; npm run prisma:purge-report-pdfs',
    );
    process.exit(1);
  }

  const count = await prisma.document.count({ where: { doc_type: 'REPORTE_PDF' } });
  console.log(`Filas documents (REPORTE_PDF) a eliminar: ${count}`);

  if (count === 0) {
    console.log('Nada que hacer.');
    await prisma.$disconnect();
    return;
  }

  const result = await prisma.document.deleteMany({ where: { doc_type: 'REPORTE_PDF' } });
  console.log(`Eliminadas: ${result.count}. Regenera el PDF desde la app cuando lo necesites.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

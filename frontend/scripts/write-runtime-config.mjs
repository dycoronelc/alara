/**
 * Railway / producción: Vite solo lee VITE_API_URL en `npm run build`.
 * Si la variable no está en la fase de build, el bundle queda con URL vacía.
 * Este script se ejecuta en `npm start` (runtime) y escribe dist/runtime-config.js
 * para que el navegador cargue la URL del API desde las variables del servicio.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');
const target = path.join(distDir, 'runtime-config.js');

const base = (process.env.VITE_API_URL || process.env.PUBLIC_API_URL || '').trim();

const content = `/* Generado al iniciar el servidor — no editar */
window.__ALARA_API_BASE__=${JSON.stringify(base)};
`;

fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(target, content, 'utf8');

if (!base) {
  console.warn(
    '[write-runtime-config] VITE_API_URL y PUBLIC_API_URL están vacías. ' +
      'El login fallará hasta definir una de ellas en Railway (servicio frontend) y redeployar.',
  );
} else {
  console.log('[write-runtime-config] API base:', base);
}

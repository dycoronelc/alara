/**
 * Evita `npm start` con dist vacío (solo runtime-config.js).
 * Si falta dist/index.html, ejecuta `npm run build` una vez.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const index = path.join(root, 'dist', 'index.html');

if (fs.existsSync(index)) {
  process.exit(0);
}

console.warn('[ensure-dist] No existe dist/index.html. Ejecutando npm run build…');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const r = spawnSync(npm, ['run', 'build'], { cwd: root, stdio: 'inherit', shell: true });
process.exit(r.status ?? 1);

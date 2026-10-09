import fs from 'node:fs/promises';
import path from 'node:path';
import { uploadsDir } from '../src/config/paths.js';
import { validateCatalog } from '../src/services/validateCatalog.js';
import { importCatalog } from './importCatalogo.js';
export async function validateAvarias(rows) {
  validateCatalog('avarias', rows);
  const realRoot = await fs.realpath(uploadsDir);
  for (const row of rows) for (const image of row.imagens || []) {
    if (!image.url.startsWith('/uploads/')) continue;
    const relative = decodeURIComponent(image.url.slice('/uploads/'.length));
    if (relative.includes('\\') || relative.includes('?') || relative.includes('#')) throw new Error('Caminho de imagem inválido.');
    const actual = await fs.realpath(path.resolve(uploadsDir,relative));
    const rel = path.relative(realRoot,actual);
    if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Imagem fora de uploads.');
    if (!/\.(png|jpe?g|webp)$/i.test(actual) || !(await fs.stat(actual)).isFile()) throw new Error('Imagem deve ser PNG/JPEG/WebP.');
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/importAvarias.js')) {
  try {
    const file = process.argv[2];
    if (!file) throw new Error('Uso: npm run import:avarias -- arquivo.json [--dry-run]');
    const rows = JSON.parse(await fs.readFile(file,'utf8'));
    await validateAvarias(rows);
    await importCatalog('avarias',file,process.argv.includes('--dry-run'));
  } catch(error) {console.error(error.message);process.exitCode=1;}
}

import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import Avaria from '../src/models/Avaria.js';
import { connectDatabase } from '../src/config/db.js';
import { uploadsDir } from '../src/config/paths.js';
import { upsertValidated } from '../src/services/upsert.js';
export async function validateAvarias(rows) {
  if (!Array.isArray(rows)) throw new Error('Esperado array JSON.');
  const realRoot = await fs.realpath(uploadsDir);
  const seen = new Set();
  for (const row of rows) {
    const doc = new Avaria(row); await doc.validate();
    if (seen.has(doc.codigo)) throw new Error('Código duplicado: ' + doc.codigo);
    seen.add(doc.codigo);
    if (JSON.stringify(row).includes('PREENCHER') || JSON.stringify(row).includes('TRANSCRIT')) throw new Error('Substitua os placeholders do template.');
    for (const image of doc.imagens) {
      if (!image.url.startsWith('/uploads/')) continue;
      const relative = decodeURIComponent(image.url.slice('/uploads/'.length));
      if (relative.includes('\\') || relative.includes('?') || relative.includes('#')) throw new Error('Caminho de imagem inválido.');
      const actual = await fs.realpath(path.resolve(uploadsDir, relative));
      const rel = path.relative(realRoot, actual);
      if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Imagem fora de uploads.');
      if (!/\.(png|jpe?g|webp)$/i.test(actual) || !(await fs.stat(actual)).isFile()) throw new Error('Imagem deve ser PNG/JPEG/WebP.');
    }
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  try {
    const file = process.argv[2];
    if (!file) throw new Error('Uso: npm run import:avarias -- arquivo.json [--dry-run]');
    const rows = JSON.parse(await fs.readFile(file, 'utf8'));
    await validateAvarias(rows);
    if (process.argv.includes('--dry-run')) console.log('Validados: ' + rows.length);
    else {
      await connectDatabase();
      console.log('Importados: ' + await upsertValidated(Avaria, rows, ['codigo']));
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { await mongoose.disconnect(); }
}

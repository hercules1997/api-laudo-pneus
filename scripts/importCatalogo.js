import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { rootDir } from '../src/config/paths.js';
import { keys, validateCatalog } from '../src/services/validateCatalog.js';
export async function importCatalog(name, file, dryRun = false) {
  if (!keys[name] || !file) throw new Error('Informe catálogo e arquivo JSON.');
  const incoming = JSON.parse(await fs.readFile(file,'utf8'));
  validateCatalog(name, incoming);
  const destination = path.join(rootDir,'data',name+'.json');
  const current = JSON.parse(await fs.readFile(destination,'utf8'));
  const keyOf = row => JSON.stringify(keys[name].map(k => row[k]));
  const merged = new Map(current.map(row => [keyOf(row), row]));
  for (const row of incoming) {
    const key = keyOf(row), old = merged.get(key);
    merged.set(key, { ...old, ...row, _id: old?._id || row._id || createHash('sha256').update(name+key).digest('hex').slice(0,24) });
  }
  const rows = [...merged.values()];
  validateCatalog(name, rows);
  if (!dryRun) {
    const temporary = destination + '.tmp';
    await fs.writeFile(temporary,JSON.stringify(rows,null,2)+'\n');
    await fs.rename(temporary,destination);
  }
  console.log((dryRun ? 'Validados: ' : 'Importados: ')+incoming.length+'. Total do catálogo: '+rows.length);
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/importCatalogo.js')) {
  try {
    if (process.argv[2] === 'avarias') throw new Error('Use npm run import:avarias para validar as imagens locais.');
    await importCatalog(process.argv[2],process.argv[3],process.argv.includes('--dry-run'));
  }
  catch(error) { console.error(error.message); process.exitCode=1; }
}

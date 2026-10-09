import fs from 'node:fs/promises';
import path from 'node:path';
import { rootDir, uploadsDir } from '../src/config/paths.js';
import { catalogs } from '../src/data/catalogos.js';
const publicDir = path.join(rootDir, 'public');
await fs.rm(publicDir, { recursive: true, force: true });
await fs.mkdir(path.join(publicDir, 'catalogos'), { recursive: true });
for (const [name, rows] of Object.entries(catalogs)) {
  const data = name === 'medidas'
    ? rows.filter(r => r.ativo !== false).sort((a,b) => a.ordem-b.ordem).map(({title,data}) => ({title,data}))
    : rows.filter(r => r.ativo !== false);
  await fs.writeFile(path.join(publicDir, 'catalogos', name + '.json'), JSON.stringify(data,null,2)+'\n');
}
let total = 0;
async function copyImages(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await copyImages(file);
    else if (entry.isFile() && /\.(png|jpe?g|webp)$/i.test(entry.name)) {
      const relative = path.relative(uploadsDir, file);
      for (const prefix of ['uploads','images']) {
        const dest = path.join(publicDir,prefix,relative);
        await fs.mkdir(path.dirname(dest), {recursive:true}); await fs.copyFile(file,dest);
      }
      total++;
    }
  }
}
await copyImages(uploadsDir);
await fs.writeFile(path.join(publicDir,'index.html'),
  '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>API Laudo Pneus</title><main><h1>API Laudo Pneus</h1><p>Catálogos JSON para o aplicativo de laudos.</p><p><a href="/health">Status</a> · <a href="/ready">Disponibilidade</a> · <a href="/api/medidas">Medidas</a></p></main></html>');
console.log('Build JSON pronto. 5 catálogos; imagens: '+total);

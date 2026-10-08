import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (file.endsWith('.js')) {
      const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
      if (result.status !== 0) throw new Error(result.stderr);
    }
  }
}
for (const dir of ['src','scripts','test','netlify']) await walk(dir);
await import('../src/app.js');
await import('../src/services/catalogs.js');
await import('../netlify/functions/api.js');
console.log('Sintaxe e imports OK.');

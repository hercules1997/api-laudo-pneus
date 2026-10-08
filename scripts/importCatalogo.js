import 'dotenv/config';
import fs from 'node:fs/promises';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/db.js';
import { catalogs } from '../src/services/catalogs.js';
import { upsertValidated } from '../src/services/upsert.js';
try {
  const [name, file] = process.argv.slice(2);
  if (!catalogs[name] || name === 'avarias' || !file) throw new Error('Uso: npm run import:catalogo -- medidas|marcas|bandas|pneus arquivo.json');
  const rows = JSON.parse(await fs.readFile(file, 'utf8'));
  const { Model, keys } = catalogs[name];
  if (!Array.isArray(rows)) throw new Error('Esperado array JSON.');
  for (const row of rows) await new Model(row).validate();
  await connectDatabase();
  console.log('Importados: ' + await upsertValidated(Model, rows, keys));
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await mongoose.disconnect(); }

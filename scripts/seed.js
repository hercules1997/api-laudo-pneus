import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/db.js';
import { catalogs } from '../src/services/catalogs.js';
import { upsertValidated } from '../src/services/upsert.js';
try {
  const names = process.argv.slice(2);
  if (names.some(n => !catalogs[n])) throw new Error('Catálogo inválido.');
  await connectDatabase();
  for (const name of names.length ? names : Object.keys(catalogs)) {
    const { Model, rows, keys } = catalogs[name];
    console.log(name + ': ' + await upsertValidated(Model, rows, keys));
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await mongoose.disconnect(); }

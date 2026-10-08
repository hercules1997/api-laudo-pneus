import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';
import { connectDatabase } from './config/db.js';
const port = Number(process.env.PORT || 3003);
let server;
try {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida.');
  await connectDatabase();
  server = app.listen(port, process.env.HOST || '0.0.0.0', () => console.log('API disponível na porta ' + port));
  server.on('error', async error => { console.error(error.message); await mongoose.disconnect(); process.exitCode = 1; });
} catch (error) { console.error('Falha ao iniciar: ' + error.message); await mongoose.disconnect(); process.exitCode = 1; }
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
  const timer = setTimeout(() => process.exit(1), 10000); timer.unref();
  if (server) server.close(async () => { await mongoose.disconnect(); clearTimeout(timer); });
  else mongoose.disconnect();
});

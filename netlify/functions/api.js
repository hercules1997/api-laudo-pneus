import serverless from 'serverless-http';
import app from '../../src/app.js';
import { connectDatabase } from '../../src/config/db.js';

const handle = serverless(app);
export async function handler(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;
  const prefix = '/.netlify/functions/api';
  const route = event.path === prefix ? '/' : event.path.startsWith(prefix + '/')
    ? event.path.slice(prefix.length) : event.path;
  // Liveness e preflight não dependem do banco. Demais chamadas reutilizam a conexão.
  if (route !== '/health' && event.httpMethod !== 'OPTIONS') {
    try { await connectDatabase(); }
    catch (error) {
      console.error('Falha na conexão MongoDB:', error.name);
      return {
        statusCode: 503,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'Banco de dados indisponível. Confira MONGO_URI e o acesso ao Atlas.' })
      };
    }
  }
  return handle({ ...event, path: route }, context);
}

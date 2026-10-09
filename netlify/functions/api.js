import serverless from 'serverless-http';
import app from '../../src/app.js';
const handle = serverless(app);
export async function handler(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;
  const prefix = '/.netlify/functions/api';
  const route = event.path === prefix ? '/' : event.path.startsWith(prefix + '/')
    ? event.path.slice(prefix.length) : event.path;
  return handle({ ...event, path: route }, context);
}

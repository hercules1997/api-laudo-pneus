import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import serverless from 'serverless-http';
import serverlessJson from '../src/middlewares/serverlessJson.js';

const app = express();
app.use(serverlessJson);
app.use(express.json({ limit: '1mb' }));
app.post('/login', (req, res) => res.json({ username: req.body?.username, passwordReceived: typeof req.body?.password === 'string' }));
app.use((err, req, res, next) => res.status(err.status || 500).json({ message: err.message }));
const handle = serverless(app);
const event = body => ({ httpMethod: 'POST', path: '/login', headers: { 'content-type': 'application/json' }, body, requestContext: { identity: { sourceIp: '127.0.0.1' } } });

test('Netlify event delivers parsed login credentials to Express 5', async () => {
  const raw = JSON.stringify({ username: 'admin', password: 'test-only-password' });
  for (const encoded of [false, true]) {
    const result = await handle({ ...event(encoded ? Buffer.from(raw).toString('base64') : raw), isBase64Encoded: encoded }, {});
    assert.equal(result.statusCode, 200);
    assert.deepEqual(JSON.parse(result.body), { username: 'admin', passwordReceived: true });
  }
});
test('Netlify rejects malformed or primitive JSON and oversized bodies', async () => {
  for (const raw of ['{broken', 'null', '"text"']) assert.equal((await handle(event(raw), {})).statusCode, 400);
  assert.equal((await handle(event(' '.repeat(1024 * 1024 + 1)), {})).statusCode, 413);
});

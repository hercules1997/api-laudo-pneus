import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { catalogs } from '../src/services/catalogs.js';
import { upsertValidated } from '../src/services/upsert.js';
import { validateAvarias } from '../scripts/importAvarias.js';
import { literalRegex } from '../src/controllers/catalogController.js';
import { connectDatabase } from '../src/config/db.js';
let mongo, server, base;
import { handler as netlifyHandler } from '../netlify/functions/api.js';
process.env.ADMIN_API_KEY = 'test-only-key';
before(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
});
test('adaptador Netlify mantém rotas e reutiliza conexão', async () => {
  const { Model, rows, keys } = catalogs.medidas;
  await upsertValidated(Model, rows, keys);
  const original = process.env.MONGO_URI;
  process.env.MONGO_URI = mongo.getUri();
  const context = {};
  try {
    const connection = mongoose.connection;
    const repeated = await Promise.all([connectDatabase(), connectDatabase()]);
    assert.ok(repeated.every(c => c === connection));
    for (const route of ['/api/medidas', '/.netlify/functions/api/api/medidas']) {
      const response = await netlifyHandler({ path: route, httpMethod: 'GET', headers: {}, queryStringParameters: {}, body: null, isBase64Encoded: false }, context);
      assert.equal(response.statusCode, 200);
      const rows = JSON.parse(response.body);
      assert.equal(rows.length, 9);
      assert.equal(rows.reduce((n,r) => n+r.data.length,0),109);
    }
    const health = await netlifyHandler({ path: '/.netlify/functions/api/health', httpMethod: 'GET', headers: {}, body: null }, context);
    assert.equal(health.statusCode,200);
    assert.equal(context.callbackWaitsForEmptyEventLoop,false);
  } finally {
    if (original === undefined) delete process.env.MONGO_URI;
    else process.env.MONGO_URI=original;
  }
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect(); if (mongo) await mongo.stop();
});
const request = (route, method = 'GET', body, auth = true) => fetch(base + route, {
  method, headers: { 'content-type': 'application/json', ...(auth ? { authorization: 'Bearer test-only-key' } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {})
});
test('seeds idempotentes, 9 categorias, 109 medidas e preços rejeitados', async () => {
  for (let repeat = 0; repeat < 2; repeat++) for (const { Model, rows, keys } of Object.values(catalogs)) await upsertValidated(Model, rows, keys);
  for (const { Model, rows } of Object.values(catalogs)) assert.equal(await Model.countDocuments(), rows.length);
  const response = await request('/api/medidas'); assert.equal(response.status, 200);
  const rows = await response.json(); assert.equal(rows.length, 9);
  assert.equal(rows.reduce((n,r) => n + r.data.length, 0), 109);
  assert.deepEqual(Object.keys(rows[0]).sort(), ['data','title']);
  assert.deepEqual(Object.keys(rows[0].data[0]).sort(), ['label','value']);
  assert.equal((await request('/api/pneus-novos', 'POST', { ...catalogs.pneus.rows[0], preco: 100 })).status, 400);
});
test('filtros exatos e busca literal', async () => {
  assert.equal(literalRegex('22.5').test('22x5'), false);
  const rows = await (await request('/api/pneus-novos?fabricante=Royal%20Black&medida=295%2F80%20R22.5')).json();
  assert.equal(rows.length, 1); assert.equal(rows[0].modelo, 'RS205');
  const search = await (await request('/api/medidas/buscar?busca=R22.5')).json();
  assert.ok(search.every(r => r.data.every(i => i.value.includes('R22.5'))));
  assert.equal((await request('/api/medidas/buscar')).status, 400);
  assert.equal((await request('/api/pneus-novos?medida=x&medida=y')).status, 400);
});
test('CRUD, conflitos, IDs e exclusão lógica', async () => {
  assert.equal((await request('/api/marcas', 'POST', { nome: 'Teste' }, false)).status, 401);
  const create = await request('/api/marcas', 'POST', { nome: 'Teste' }); assert.equal(create.status, 201);
  const row = await create.json();
  assert.equal((await request('/api/marcas', 'POST', { nome: 'Teste' })).status, 409);
  assert.equal((await request('/api/marcas/invalido')).status, 400);
  assert.equal((await request('/api/marcas/' + row._id, 'PATCH', { categorias: ['Carga'] })).status, 200);
  assert.equal((await request('/api/marcas/' + row._id, 'DELETE')).status, 204);
  assert.equal((await request('/api/marcas/' + row._id)).status, 404);
});
test('avarias exigem fonte e importação verifica arquivos', async () => {
  await assert.rejects(validateAvarias([{ codigo: '01' }]));
  const fixture = { codigo: 'TESTE', titulo: 'Fixture de teste', categoria: 'Teste', aparencia: 'Teste', causas: [], acao: 'Teste', precaucao: 'Teste', fonte: { nome: 'Teste', documento: 'Documento de teste', pagina: 1 } };
  await validateAvarias([fixture]); await assert.rejects(validateAvarias([fixture,fixture]));
  await assert.rejects(validateAvarias([{ ...fixture, imagens: [{ url: '/uploads/inexistente.jpg' }] }]));
  assert.equal((await request('/api/avarias', 'POST', fixture)).status, 201);
});
test('health, readiness e erros HTTP', async () => {
  assert.equal((await request('/health')).status, 200);
  assert.equal((await request('/ready')).status, 200);
  assert.equal((await request('/inexistente')).status, 404);
  const malformed = await fetch(base + '/api/marcas', { method: 'POST', headers: { 'content-type':'application/json' }, body: '{' });
  assert.equal(malformed.status, 400);
});

test('todos os catálogos e aliases respondem com dados', async () => {
  for (const [route, count] of [['/api/avarias',1],['/api/marcas',3],['/api/bandas-vipal',2],['/api/bandas',2],['/api/pneus-novos',6],['/api/pneus',6]]) {
    const response = await request(route); assert.equal(response.status,200);
    assert.equal((await response.json()).length,count);
  }
});
test('imagens locais são validadas e servidas em uploads/images', async () => {
  const fs = await import('node:fs/promises');
  const { uploadsDir } = await import('../src/config/paths.js');
  const path = await import('node:path');
  const imagePath = path.join(uploadsDir, 'test-fixture.png');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64');
  try {
    await fs.writeFile(imagePath,png);
    const fixture = { codigo:'FOTO-TESTE', titulo:'Teste', categoria:'Teste', aparencia:'Teste', acao:'Teste', precaucao:'Teste', fonte:{nome:'Teste',documento:'Teste',pagina:1}, imagens:[{url:'/uploads/test-fixture.png',principal:true}] };
    await validateAvarias([fixture]);
    for (const route of ['/uploads/test-fixture.png','/images/test-fixture.png']) {
      const response=await request(route); assert.equal(response.status,200);
      assert.equal(response.headers.get('content-type'),'image/png');
      assert.deepEqual(Buffer.from(await response.arrayBuffer()),png);
    }
  } finally { await fs.unlink(imagePath); }
});
test('escrita sem configuração fica desabilitada', async () => {
  const key=process.env.ADMIN_API_KEY; delete process.env.ADMIN_API_KEY;
  try { assert.equal((await request('/api/marcas','POST',{nome:'Desabilitada'})).status,503); }
  finally { process.env.ADMIN_API_KEY=key; }
});
test('server.js inicia, conecta e encerra corretamente', async () => {
  const { spawn } = await import('node:child_process');
  const net = await import('node:net');
  const reservation=net.createServer();
  await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));
  const port=reservation.address().port;
  await new Promise(resolve=>reservation.close(resolve));
  const child=spawn(process.execPath,['src/server.js'],{
    env:{...process.env,MONGO_URI:mongo.getUri(),PORT:String(port),HOST:'127.0.0.1',NODE_ENV:'test'},
    stdio:['ignore','pipe','pipe'],windowsHide:true
  });
  try {
    let output='';
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Servidor não iniciou: '+output)),15000);
      child.stdout.on('data',chunk=>{
        output+=chunk.toString();
        if(output.includes('API disponível')){clearTimeout(timer);resolve();}
      });
      child.stderr.on('data',chunk=>output+=chunk.toString());
      child.once('exit',code=>{clearTimeout(timer);reject(new Error('Servidor encerrou: '+code+' '+output));});
    });
    assert.equal((await fetch('http://127.0.0.1:'+port+'/ready')).status,200);
  } finally {
    child.kill();
    await new Promise(resolve=>{if(child.exitCode!==null)resolve();else child.once('exit',resolve);});
  }
});

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import app from '../src/app.js';
import { catalogs } from '../src/data/catalogos.js';
import { validateCatalog } from '../src/services/validateCatalog.js';
import { validateAvarias } from '../scripts/importAvarias.js';
import { handler } from '../netlify/functions/api.js';
let server, base;
before(async () => {
  process.env.MONGO_URI = 'INVALIDO_DEVE_SER_IGNORADO';
  server = app.listen(0,'127.0.0.1');
  await new Promise(resolve => server.once('listening',resolve));
  base = 'http://127.0.0.1:'+server.address().port;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });
const get = route => fetch(base+route);
test('JSON preserva todos os dados e formato React Native', async () => {
  const r = await get('/api/medidas'); assert.equal(r.status,200);
  const rows = await r.json(); assert.equal(rows.length,9);
  assert.equal(rows.reduce((n,s)=>n+s.data.length,0),109);
  assert.deepEqual(rows.map(r=>r.title),[...catalogs.medidas].sort((a,b)=>a.ordem-b.ordem).map(r=>r.title));
  assert.deepEqual(Object.keys(rows[0]).sort(),['data','title']);
  assert.deepEqual(Object.keys(rows[0].data[0]).sort(),['label','value']);
  for(const [route,count] of [['/api/marcas',3],['/api/bandas-vipal',2],['/api/bandas',2],['/api/pneus-novos',6],['/api/pneus',6],['/api/avarias',0]]) {
    const r=await get(route);assert.equal(r.status,200);assert.equal((await r.json()).length,count);
  }
});
test('filtros por fabricante/medida/eixo e busca funcionam sem banco', async () => {
  const pneus=await (await get('/api/pneus-novos?fabricante=royal%20black&medida=295%2F80%20R22.5')).json();
  assert.equal(pneus.length,1);assert.equal(pneus[0].modelo,'RS205');
  assert.equal((await (await get('/api/pneus-novos?eixo=Direcional')).json()).length,4);
  assert.equal((await (await get('/api/pneus-novos?medida=295%2F80%20R22x5')).json()).length,0);
  assert.equal((await (await get('/api/bandas-vipal?busca=VT110')).json()).length,1);
  const rows=await (await get('/api/medidas/buscar?busca=R22.5')).json();
  assert.ok(rows.length>0);assert.ok(rows.every(r=>r.data.every(i=>i.value.includes('R22.5'))));
  assert.equal((await get('/api/medidas/buscar')).status,400);
  assert.equal((await get('/api/pneus-novos?medida=x&medida=y')).status,400);
  assert.equal((await (await get('/api/medidas?slug=agricola')).json()).length,1);
});
test('IDs preservados e endpoints de escrita retornam 405', async () => {
  const row=catalogs.pneus[0];
  assert.equal((await (await get('/api/pneus-novos/'+row._id)).json()).modelo,row.modelo);
  assert.equal((await get('/api/pneus-novos/invalido')).status,400);
  assert.equal((await get('/api/pneus-novos/000000000000000000000000')).status,404);
  for(const method of ['POST','PUT','PATCH','DELETE']) {
    const route=method==='POST'?'/api/pneus-novos':'/api/pneus-novos/'+row._id;
    const r=await fetch(base+route,{method});assert.equal(r.status,405);
    assert.equal(r.headers.get('allow'),'GET, HEAD, OPTIONS');
  }
});
test('health/ready não dependem de MONGO_URI e preflight funciona', async () => {
  assert.equal((await get('/health')).status,200);
  assert.deepEqual(await (await get('/ready')).json(),{status:'ok',storage:'json'});
  assert.equal((await get('/rota-inexistente')).status,404);
  const preflight=await fetch(base+'/api/medidas',{method:'OPTIONS',headers:{Origin:'https://app.example','Access-Control-Request-Method':'GET'}});
  assert.equal(preflight.status,204);
});
test('adaptador Netlify lê JSON embutido e mantém query strings', async () => {
  const context={};
  for(const route of ['/api/medidas','/.netlify/functions/api/api/medidas']) {
    const r=await handler({path:route,httpMethod:'GET',headers:{},queryStringParameters:{},body:null},context);
    assert.equal(r.statusCode,200);assert.equal(JSON.parse(r.body).length,9);
  }
  const r=await handler({path:'/.netlify/functions/api/api/pneus-novos',httpMethod:'GET',headers:{},queryStringParameters:{fabricante:'Continental'},body:null},context);
  assert.equal(r.statusCode,200);assert.equal(JSON.parse(r.body).length,2);
  assert.equal(context.callbackWaitsForEmptyEventLoop,false);
});
test('validação rejeita preços, duplicatas e avarias sem fonte', async () => {
  assert.throws(()=>validateCatalog('pneus',[{...catalogs.pneus[0],preco:100}]));
  assert.throws(()=>validateCatalog('pneus',[catalogs.pneus[0],catalogs.pneus[0]]));
  await assert.rejects(validateAvarias([{codigo:'01'}]));
  const fixture={codigo:'TESTE',titulo:'Teste',categoria:'Teste',aparencia:'Teste',acao:'Teste',precaucao:'Teste',causas:[],fonte:{nome:'Teste',documento:'Teste',pagina:1},imagens:[]};
  await validateAvarias([fixture]);
  await assert.rejects(validateAvarias([{...fixture,imagens:[{url:'/uploads/inexistente.png'}]}]));
});
test('arquivos de imagem são servidos e importador confere associação local', async () => {
  const imagePath=path.resolve('uploads/test-fixture.png');
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=','base64');
  try {
    await fs.writeFile(imagePath,png);
    for(const route of ['/uploads/test-fixture.png','/images/test-fixture.png']) {
      const r=await get(route);assert.equal(r.status,200);assert.deepEqual(Buffer.from(await r.arrayBuffer()),png);
    }
  }finally{await fs.unlink(imagePath);}
});
test('importação local é idempotente e dry-run não modifica JSON', async () => {
  const scratch=path.resolve('node_modules/.cache/api-laudo-pneus/import-test');
  await fs.mkdir(path.join(scratch,'data'),{recursive:true});
  await fs.writeFile(path.join(scratch,'data','marcas.json'),'[]');
  const incoming=path.join(scratch,'incoming.json');
  await fs.writeFile(incoming,JSON.stringify([{nome:'Marca de teste',categorias:['Carga'],ativo:true}]));
  const moduleFile=path.resolve('scripts/importCatalogo.js');
  const code=`import {importCatalog} from ${JSON.stringify('file:///'+moduleFile.replaceAll('\\','/'))};await importCatalog('marcas',process.argv[1],true);await importCatalog('marcas',process.argv[1]);await importCatalog('marcas',process.argv[1]);`;
  const child=spawn(process.execPath,['--input-type=module','-e',code,incoming],{cwd:scratch,env:{...process.env,LAMBDA_TASK_ROOT:scratch},windowsHide:true,stdio:['ignore','pipe','pipe']});
  let stderr='';child.stderr.on('data',d=>stderr+=d);child.stdout.resume();
  const status=await new Promise((resolve,reject)=>{child.once('exit',resolve);child.once('error',reject);});
  assert.equal(status,0,stderr);
  const rows=JSON.parse(await fs.readFile(path.join(scratch,'data','marcas.json'),'utf8'));
  assert.equal(rows.length,1);assert.match(rows[0]._id,/^[a-f\d]{24}$/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { build } from 'esbuild';
test('Function CommonJS contém JSON e funciona sem credenciais ou conexão externa',async()=>{
  const outfile=path.resolve('node_modules/.cache/api-laudo-pneus/netlify-regression/api.cjs');
  try {
    await build({entryPoints:['netlify/functions/api.js'],outfile,bundle:true,platform:'node',format:'cjs',target:'node22',packages:'external'});
    const content=await fs.readFile(outfile,'utf8');
    assert.ok(!content.includes("require(\"mongoose\")"));
    const code=`const {handler}=require(${JSON.stringify(outfile)});(async()=>{const rows=[];for(const route of ['/health','/ready','/api/medidas','/api/pneus-novos']){const r=await handler({path:'/.netlify/functions/api'+route,httpMethod:'GET',headers:{},queryStringParameters:route.endsWith('pneus-novos')?{fabricante:'Continental'}:{},body:null},{});const body=JSON.parse(r.body);rows.push({status:r.statusCode,count:Array.isArray(body)?body.length:undefined,storage:body.storage});}console.log(JSON.stringify(rows));})().catch(e=>{console.error(e.name);process.exit(1)});`;
    const child=spawn(process.execPath,['-e',code],{env:{...process.env,NODE_ENV:'test',MONGO_URI:'INVALIDO_DEVE_SER_IGNORADO',LAMBDA_TASK_ROOT:process.cwd()},windowsHide:true,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);
    const status=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill();reject(new Error('Bundle excedeu tempo'));},15000);child.once('error',reject);child.once('exit',code=>{clearTimeout(timer);resolve(code);});});
    assert.equal(status,0,stderr);const result=JSON.parse(stdout.trim());
    assert.deepEqual(result.map(r=>r.status),[200,200,200,200]);
    assert.equal(result[1].storage,'json');assert.equal(result[2].count,9);assert.ok(result[3].count>=30);
  }finally{await fs.rm(outfile,{force:true});}
});

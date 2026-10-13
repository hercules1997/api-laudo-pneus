import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {criarArquivosPrivados} from '../src/documents/arquivosPrivados.js';
test('Arquivos privados usam chaves por autor, documento e versão e verificam integridade',async()=>{
 const nomes=['STORAGE_ENDPOINT','STORAGE_ACCESS_KEY_ID','STORAGE_SECRET_ACCESS_KEY','STORAGE_BUCKET'];const antes=Object.fromEntries(nomes.map(nome=>[nome,process.env[nome]]));
 Object.assign(process.env,{STORAGE_ENDPOINT:'https://storage.example.test',STORAGE_ACCESS_KEY_ID:'teste',STORAGE_SECRET_ACCESS_KEY:'teste',STORAGE_BUCKET:'privado'});
 const objetos=new Map();const cliente={async fetch(url,opcoes){if(opcoes.method==='PUT'){objetos.set(url,Buffer.from(opcoes.body));return new Response(null,{status:200});}return objetos.has(url)?new Response(objetos.get(url)):new Response(null,{status:404});}};
 try{const files=criarArquivosPrivados(cliente),bytes=Buffer.from('%PDF-1.7\nTeste'),sha256=createHash('sha256').update(bytes).digest('hex');const ref=await files.put({ownerId:'autor',documentId:'documento',version:1,bytes,sha256});assert.equal(ref.provider,'neon-storage');assert.equal(ref.key,'autor/documento/v1/'+sha256);assert.deepEqual(await files.read(ref),bytes);await assert.rejects(files.read({...ref,key:'../outro'}),e=>e.status===400);await assert.rejects(files.read({...ref,sha256:'0'.repeat(64)}),e=>e.status===409);await assert.rejects(files.put({ownerId:'autor',documentId:'documento',version:1,bytes,sha256:'0'.repeat(64)}),e=>e.status===400);assert.equal([...objetos.keys()][0].startsWith('https://storage.example.test/privado/autor/'),true);}finally{for(const nome of nomes)antes[nome]===undefined?delete process.env[nome]:process.env[nome]=antes[nome];}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {createHash} from 'node:crypto';
import {createDocumentRouter} from '../src/documents/documentRoutes.js';
import {newDocument,reviseDocument,submitDocument,decideDocument,canShareDocument,assignDocument} from '../src/documents/documentWorkflow.mjs';
const author={id:'c1',role:'consultor',unitIds:['maravilha']};
const manager={id:'g1',role:'gestor',unitIds:['maravilha']};
test('Managers create their own reports/proposals without approval; payload cannot grant consultant exemption',()=>{
 for(const type of ['laudo-completo','laudo-destinacao','proposta']){
  const doc=newDocument({id:'manager-doc',type,payload:{unidade:'maravilha'}},manager);
  assert.equal(doc.authorRole,'gestor');assert.equal(doc.status,'salvo');assert.equal(canShareDocument(doc,manager),true);
  const revised=reviseDocument(doc,{expectedRevision:1,payload:{unidade:'maravilha',authorRole:'consultor'}},manager);
  assert.equal(revised.authorRole,'gestor');assert.equal(revised.status,'salvo');
  assert.throws(()=>submitDocument(doc,{expectedRevision:1},manager),{status:409});
 }
 const forged=newDocument({id:'forged',type:'proposta',payload:{unidade:'maravilha',authorRole:'gestor'}},author);
 assert.equal(forged.authorRole,'consultor');assert.equal(forged.status,'rascunho');assert.equal(canShareDocument(forged,author),false);
});
for(const type of ['laudo-completo','laudo-destinacao'])test(type+' saves, revises and shares without entering approval',()=>{
 const doc=newDocument({id:'d1',type,payload:{unidade:'maravilha'}},author);
 assert.equal(doc.status,'salvo');assert.equal(canShareDocument(doc,author),true);
 assert.equal(canShareDocument(doc,manager),true);
 assert.equal(canShareDocument(doc,{...manager,unitIds:['gaspar']}),false);
 assert.equal(canShareDocument(doc,{...author,id:'other'}),false);
 for(const status of ['rascunho','pendente','reprovado','aprovado'])assert.equal(canShareDocument({...doc,status},author),true);
 for(const action of [submitDocument,decideDocument,assignDocument])assert.throws(()=>action(doc,{expectedRevision:1},manager),{status:409});
 const revised=reviseDocument(doc,{expectedRevision:1,payload:{unidade:'maravilha',cliente:'Revisado'}},author);
 assert.equal(revised.status,'salvo');assert.equal(revised.versions.length,1);assert.equal(revised.version,2);
});
test('HTTP persists report PDF/photos, shares legacy reports, and validates approved proposal tickets',async()=>{
 const secret=process.env.AUTH_JWT_SECRET;process.env.AUTH_JWT_SECRET='policy-fixture-secret-'.repeat(3);
 const pdf=Buffer.from('%PDF-1.7\nfixture'),sha256=createHash('sha256').update(pdf).digest('hex');
 let doc=newDocument({id:'doc',type:'laudo-completo',payload:{unidade:'maravilha'}},author);
 const store={ready:true,get:async id=>id===doc.id?doc:null,list:async()=>[doc],compareAndSwap:async(id,revision,next)=>{assert.equal(revision,doc.revision);doc=next;}};
 const files={ready:true,put:async({sha256,contentType})=>({key:'private',sha256,contentType}),read:async()=>pdf};
 const app=express();app.use(express.json());app.use('/api/documentos',createDocumentRouter({enabled:true,approvalsRequired:true,store,files,requireUser:(req,res,next)=>{req.authUser=author;next();}}));
 app.use((e,req,res,next)=>res.status(e.status||500).json({message:e.message}));
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 const post=(path,body)=>fetch(base+'/api/documentos'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 try{
  const capabilities=await(await fetch(base+'/api/documentos/capabilities')).json();assert.deepEqual(capabilities.approvalTypes,['proposta']);
  assert.equal((await post('/doc/pdf',{expectedRevision:1,base64:pdf.toString('base64')})).status,200);
  const photo=Buffer.from([255,216,255,0]);assert.equal((await post('/doc/fotos',{expectedRevision:2,contentType:'image/jpeg',base64:photo.toString('base64')})).status,200);
  doc.status='pendente';const share=await post('/doc/share',{expectedRevision:doc.revision});assert.equal(share.status,200);
  const ticket=await share.json();assert.equal((await fetch(base+ticket.path)).status,200);
  assert.equal((await post('/doc/submit',{expectedRevision:doc.revision})).status,409);
  doc={...doc,type:'proposta',status:'pendente',pdfRef:{key:'private',sha256}};
  assert.equal((await post('/doc/share',{expectedRevision:doc.revision})).status,403);
  doc=decideDocument(doc,{expectedRevision:doc.revision,version:doc.version,approved:true},manager);
  const approved=await post('/doc/share',{expectedRevision:doc.revision});assert.equal(approved.status,200);
  const approvedTicket=await approved.json();assert.equal((await fetch(base+approvedTicket.path)).status,200);
  doc.pdfRef.sha256='b'.repeat(64);assert.equal((await fetch(base+approvedTicket.path)).status,403);
 }finally{await new Promise(r=>server.close(r));if(secret===undefined)delete process.env.AUTH_JWT_SECRET;else process.env.AUTH_JWT_SECRET=secret;}
});

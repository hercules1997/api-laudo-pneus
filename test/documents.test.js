import test from 'node:test';import assert from 'node:assert/strict';
import express from 'express';import {createDocumentRouter} from '../src/documents/documentRoutes.js';
import {newDocument,reviseDocument,submitDocument,decideDocument,assignDocument,canShareDocument,canReadDocument,canEditDocument,canDeleteDocument,deleteDocument} from '../src/documents/documentWorkflow.mjs';
const consultant={id:'c1',name:'Consultor',role:'consultor',unitIds:['maravilha']},other={id:'c2',role:'consultor',unitIds:['maravilha']},manager={id:'m1',role:'gestor',unitIds:['maravilha']},manager2={id:'m2',role:'gestor',unitIds:['maravilha']},admin={id:'a1',role:'admin'};
const create=()=>newDocument({id:'d1',type:'proposta',payload:{unidade:'maravilha',cliente:'Teste',itens:[{tipo:'servico',descricao:'Vulcanização',quantidade:1,precoCentavos:1000}]},pdfRef:{key:'private-v1.pdf',sha256:'a'.repeat(64)}},consultant);
test('Ownership, submission, rejection and resubmission preserve a complete audit trail',()=>{let doc=create();assert.equal(canReadDocument(doc,other),false);assert.equal(canShareDocument(doc,consultant),false);assert.equal(canShareDocument(doc,consultant,{approvalsRequired:false}),true);doc=submitDocument(doc,{expectedRevision:1},consultant);assert.equal(doc.status,'pendente');assert.throws(()=>decideDocument(doc,{expectedRevision:2,version:1,approved:false},manager),/justificativa/);doc=decideDocument(doc,{expectedRevision:2,version:1,approved:false,notes:'Corrigir dados'},manager);assert.equal(doc.status,'reprovado');doc=reviseDocument(doc,{expectedRevision:3,payload:{unidade:'maravilha',cliente:'Corrigido'},pdfRef:{key:'private-v2.pdf',sha256:'b'.repeat(64)}},consultant);doc=submitDocument(doc,{expectedRevision:4},consultant);assert.equal(doc.status,'reenviado');assert.equal(doc.version,2);assert.equal(doc.versions[0].decision.managerId,'m1');assert.ok(doc.history.some(h=>h.action==='rejected'));});
test('Two managers cannot decide the same revision and editing invalidates approval',()=>{let doc=submitDocument(create(),{expectedRevision:1},consultant);doc=decideDocument(doc,{expectedRevision:2,version:1,approved:true},manager);assert.equal(canShareDocument(doc,consultant),true);assert.throws(()=>decideDocument(doc,{expectedRevision:2,version:1,approved:false,notes:'Conflict'},manager2),/outra sessão/);assert.throws(()=>reviseDocument(doc,{expectedRevision:3,payload:{unidade:'maravilha',cliente:'New'}},consultant),/não pode ser editada/);const ownedByAdmin={...doc,ownerId:admin.id};const revised=reviseDocument(ownedByAdmin,{expectedRevision:3,payload:{unidade:'maravilha',cliente:'New'}},admin);assert.equal(canShareDocument(revised,consultant),false);assert.equal(revised.versions[0].status,'aprovado');assert.equal(revised.versions[0].pdfRef.key,'private-v1.pdf');assert.equal(doc.status,'aprovado');});
test('Assignment restricts managers and authors cannot approve themselves',()=>{let doc=create();doc=assignDocument(doc,{expectedRevision:1,managerIds:['m1']},admin);doc=submitDocument(doc,{expectedRevision:2},consultant);assert.equal(canReadDocument(doc,manager2),true);assert.throws(()=>decideDocument(doc,{expectedRevision:3,version:1,approved:true},manager2),/não autorizado/);assert.throws(()=>decideDocument(doc,{expectedRevision:3,version:1,approved:true},{...consultant,role:'gestor',unitIds:['maravilha']}),/não autorizado/);});
test('Unconfigured document API stays disabled even when flag is true',async()=>{const app=express();app.use('/api/documentos',createDocumentRouter({requireUser:(req,res,next)=>{req.authUser=consultant;next();},enabled:true,approvalsRequired:true}));app.use((e,req,res,next)=>res.status(e.status||500).json({message:e.message}));const server=app.listen(0);await new Promise(r=>server.once('listening',r));try{const base='http://127.0.0.1:'+server.address().port;const cap=await(await fetch(base+'/api/documentos/capabilities')).json();assert.equal(cap.enabled,false);assert.equal(cap.approvalsRequired,false);assert.equal((await fetch(base+'/api/documentos')).status,503);}finally{await new Promise(r=>server.close(r));}});

test('Document visibility follows account and unit boundaries for every status',()=>{const doc=create();assert.equal(canReadDocument(doc,consultant),true);assert.equal(canReadDocument(doc,other),false);assert.equal(canReadDocument(doc,manager),false);assert.equal(canReadDocument(submitDocument(doc,{expectedRevision:1},consultant),manager),true);assert.equal(canReadDocument(doc,{id:'other-manager',role:'gestor',unitIds:['gaspar']}),false);assert.equal(canReadDocument(doc,admin),true);});

test('Proposal permissions cover every status, units, rejection and deletion audit',()=>{
 const draft=create();
 for(const status of ['rascunho','pendente','reenviado','aprovado','reprovado']){
  const doc={...draft,status};const editable=['rascunho','reprovado'].includes(status);
  assert.equal(canEditDocument(doc,consultant),editable,status);
  assert.equal(canDeleteDocument(doc,consultant),editable,status);
  assert.equal(canReadDocument(doc,manager),status!=='rascunho',status);
  assert.equal(canDeleteDocument(doc,manager),status!=='rascunho',status);
  assert.equal(canDeleteDocument(doc,other),false);
  assert.equal(canDeleteDocument(doc,{...manager,unitIds:['gaspar']}),false);
  if(!editable)assert.throws(()=>reviseDocument(doc,{expectedRevision:1,payload:doc.payload},consultant),{status:403});
 }
 const sent=submitDocument(draft,{expectedRevision:1},consultant);
 assert.throws(()=>deleteDocument(sent,{expectedRevision:2},consultant),{status:403});
 const removed=deleteDocument(sent,{expectedRevision:2},manager);
 assert.equal(removed.deletedBy,manager.id);assert.equal(removed.history.at(-1).action,'deleted');
 for(const user of [consultant,manager,admin])assert.equal(canReadDocument(removed,user),false);
 assert.equal(canShareDocument(removed,admin,{approvalsRequired:false}),false);
 assert.throws(()=>deleteDocument(sent,{expectedRevision:1},manager),{status:409});
 const rejected=decideDocument(sent,{expectedRevision:2,version:1,approved:false,notes:'Corrigir'},manager);
 const revised=reviseDocument(rejected,{expectedRevision:3,payload:rejected.payload,pdfRef:draft.pdfRef},consultant);
 assert.equal(canReadDocument(revised,manager),false);
 assert.equal(canReadDocument(submitDocument(revised,{expectedRevision:4},consultant),manager),true);
});
test('HTTP routes hide drafts and PDFs, enforce submitted locks and manager approval/deletion',async()=>{
 let doc=create();const store={ready:true,list:async()=>[doc],get:async id=>id===doc.id?doc:null,compareAndSwap:async(id,revision,next)=>{assert.equal(doc.revision,revision);doc=next;}};
 const app=express();app.use(express.json());app.use('/api/documentos',createDocumentRouter({enabled:true,approvalsRequired:true,store,files:{ready:true,read:async()=>Buffer.from('%PDF-1.7')},requireUser:(req,res,next)=>{req.authUser=req.headers['x-role']==='gestor'?manager:consultant;next();}}));
 app.use((e,req,res,next)=>res.status(e.status||500).json({message:e.message}));
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port+'/api/documentos';
 const call=(path,role='consultor',method='GET',body)=>fetch(base+path,{method,headers:{'x-role':role,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 try{
  assert.deepEqual(await(await call('','gestor')).json(),[]);
  for(const path of ['/d1','/d1/pdf','/d1/fotos/missing'])assert.equal((await call(path,'gestor')).status,403);
  assert.equal((await call('/d1/submit','consultor','POST',{expectedRevision:1})).status,200);
  assert.equal((await(await call('','gestor')).json()).length,1);
  assert.equal((await call('/d1','consultor','PATCH',{expectedRevision:2,payload:doc.payload})).status,403);
  assert.equal((await call('/d1','consultor','DELETE',{expectedRevision:2})).status,403);
  assert.equal((await call('/d1/decision','gestor','POST',{expectedRevision:2,version:1,approved:true})).status,200);
  assert.equal(doc.status,'aprovado');
  assert.equal((await call('/d1','consultor','DELETE',{expectedRevision:3})).status,403);
  assert.equal((await call('/d1','gestor','DELETE',{expectedRevision:2})).status,409);
  assert.equal((await call('/d1','gestor','DELETE',{expectedRevision:3})).status,204);
  assert.deepEqual(await(await call('')).json(),[]);
  assert.equal((await call('/d1/pdf')).status,404);
 }finally{await new Promise(r=>server.close(r));}
});

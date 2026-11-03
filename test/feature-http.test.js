import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {createDocumentRouter} from '../src/documents/documentRoutes.js';
import {newDocument,canReadDocument,canEditDocument,decideDocument} from '../src/documents/documentWorkflow.mjs';
const full={id:'c',role:'consultor',name:'Consultor',unitIds:['maravilha']};
const readOnly={...full,featureAccess:{laudoFoto:{view:true,write:false}}};
test('Feature grants never bypass ownership, units, drafts or read-only manager decisions',()=>{
 const report=newDocument({id:'r',type:'laudo-completo',payload:{unidade:'maravilha'}},full);
 assert(canReadDocument(report,readOnly));assert(!canEditDocument(report,readOnly));
 assert(!canReadDocument(report,{...full,id:'other'}));
 assert(!canReadDocument(report,{id:'m',role:'gestor',unitIds:['gaspar']}));
 const proposal={...report,type:'proposta',status:'pendente',pdfRef:{sha256:'hash'},assignedManagerIds:[]};
 const manager={id:'m',role:'gestor',unitIds:['maravilha'],featureAccess:{propostas:{view:true,write:false}}};
 assert(canReadDocument(proposal,manager));
 assert.throws(()=>decideDocument(proposal,{expectedRevision:1,version:1,approved:true},manager),{status:403});
 assert(!canReadDocument({...proposal,status:'rascunho'},manager));
});
test('HTTP denies direct access, uploads and creates; updated policy applies to current session',async()=>{
 const report=newDocument({id:'r',type:'laudo-completo',payload:{unidade:'maravilha'}},full);
 let user=readOnly,writes=0;
 const store={ready:true,list:async()=>[report],get:async()=>report,create:async()=>writes++,compareAndSwap:async()=>writes++};
 const app=express();app.use(express.json());app.use('/docs',createDocumentRouter({enabled:true,store,files:{ready:true,read:async()=>Buffer.from('%PDF-1.7')},requireUser:(req,res,next)=>{req.authUser=user;next();}}));
 app.use((error,req,res,next)=>res.status(error.status||500).json({message:error.message}));
 const server=app.listen(0);await new Promise(resolve=>server.once('listening',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/docs';
 const call=(path='',method='GET',body)=>fetch(url+path,{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 try {
  assert.equal((await(await call()).json()).length,1);
  for(const path of ['/r','/r/pdf','/r/fotos'])assert.equal((await call(path,path==='/r'?'PATCH':'POST',{expectedRevision:1})).status,403);
  assert.equal((await call('','POST',{type:'laudo-completo',payload:{unidade:'maravilha'}})).status,403);
  user={...full,featureAccess:{}};
  assert.deepEqual(await(await call()).json(),[]);
  for(const path of ['/r','/r/pdf','/r/fotos/abc'])assert.equal((await call(path)).status,403);
  assert.equal(writes,0);
 } finally {await new Promise(resolve=>server.close(resolve));}
});

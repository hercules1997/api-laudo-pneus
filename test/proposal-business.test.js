import test from 'node:test';
import assert from 'node:assert/strict';
import pneus from '../data/pneus.json' with {type:'json'};
import {catalogProposalItems} from '../src/documents/proposalPolicy.mjs';
import {validateProposalBusiness} from '../src/documents/proposalBusiness.js';
import express from 'express';
import {createDocumentRouter} from '../src/documents/documentRoutes.js';
const product=pneus.find(product=>product.eixo.includes('Tração'));
const novo=catalogProposalItems([{tipo:'novo',produtoId:product._id,medida:product.medida,quantidade:2,precoCentavos:30000}],pneus)[0];
test('Server rejects mixed categories, omitted item types and manipulated catalog applications',()=>{
 assert.doesNotThrow(()=>validateProposalBusiness({tipoProposta:'novo',itens:[novo]}));
 for(const itens of [[novo,{tipo:'reforma',quantidade:1,precoCentavos:1000}],[{...novo,tipo:undefined}]])assert.throws(()=>validateProposalBusiness({tipoProposta:'novo',itens}),{status:400});
 assert.throws(()=>validateProposalBusiness({tipoProposta:'novo',itens:[{...novo,aplicacao:'Dianteira'}]}),{status:409});
 assert.throws(()=>validateProposalBusiness({tipoProposta:'novo',itens:[{...novo,produtoId:'inexistente'}]}),{status:400});
 assert.doesNotThrow(()=>validateProposalBusiness({tipoProposta:'reforma',itens:[{tipo:'servico',descricao:'Vulcanização',quantidade:1,precoCentavos:1000}]}));
});
test('HTTP creation enforces category/application rules before persisting a proposal',async()=>{
 const user={id:'business-c',role:'consultor',name:'Consultor Teste',unitIds:['maravilha']};let created=0;
 const app=express();app.use(express.json());
 app.use('/api/documentos',createDocumentRouter({enabled:true,approvalsRequired:true,requireUser:(req,res,next)=>{req.authUser=user;next();},store:{ready:true,get:async()=>null,create:async()=>{created++;}},files:{ready:true}}));
 app.use((error,req,res,next)=>res.status(error.status||500).json({message:error.message}));
 const server=app.listen(0);await new Promise(resolve=>server.once('listening',resolve));
 const base='http://127.0.0.1:'+server.address().port+'/api/documentos';
 const payload={unidade:'maravilha',tipoProposta:'novo',contatos:[{nome:user.name,email:'',telefone:''}],itens:[novo]};
 const create=body=>fetch(base,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'proposta',payload:body})});
 try{
  assert.equal((await create({...payload,itens:[novo,{tipo:'reforma',quantidade:1,precoCentavos:1000}]})).status,400);
  assert.equal((await create({...payload,itens:[{...novo,aplicacao:'Dianteira'}]})).status,409);
  assert.equal(created,0);assert.equal((await create(payload)).status,201);assert.equal(created,1);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

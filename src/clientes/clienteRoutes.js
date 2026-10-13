import {Router} from 'express';
import {limparDocumento,validarCnpj} from './documentoFiscal.mjs';
const erro=(status,message)=>Object.assign(new Error(message),{status});
export function criarRotasClientes({requireUser,consultar=fetch}={}){
 const router=Router(),tentativas=new Map();router.use(requireUser);
 router.get('/cnpj/:documento',async(req,res)=>{
  const cnpj=limparDocumento(req.params.documento);if(!validarCnpj(cnpj))throw erro(400,'CNPJ inválido. Confira os dígitos.');
  const agora=Date.now(),recentes=(tentativas.get(req.authUser.id)||[]).filter(data=>agora-data<60000);if(recentes.length>=10)throw erro(429,'Aguarde um minuto antes de fazer novas consultas.');recentes.push(agora);tentativas.set(req.authUser.id,recentes);if(tentativas.size>1000)tentativas.clear();
  let resposta;try{resposta=await consultar('https://brasilapi.com.br/api/cnpj/v1/'+cnpj,{signal:AbortSignal.timeout(8000)});}catch{throw erro(503,'Consulta indisponível. Você pode preencher o cliente manualmente.');}
  if(resposta.status===404)throw erro(404,'CNPJ não encontrado na base consultada. Confira ou preencha manualmente.');if(!resposta.ok)throw erro(503,'A base de CNPJ está indisponível para esta consulta. Preencha manualmente.');
  const dados=await resposta.json();if(typeof dados.razao_social!=='string')throw erro(503,'Resposta incompleta da consulta de CNPJ.');
  const texto=valor=>typeof valor==='string'?valor.trim():'';
  res.set('Cache-Control','no-store').json({documento:cnpj,tipo:'cnpj',nome:texto(dados.razao_social),nomeFantasia:texto(dados.nome_fantasia),email:texto(dados.email),telefone:texto(dados.ddd_telefone_1),endereco:[dados.descricao_tipo_de_logradouro,dados.logradouro,dados.numero,dados.complemento].map(texto).filter(Boolean).join(' '),bairro:texto(dados.bairro),cidade:texto(dados.municipio),uf:texto(dados.uf),cep:texto(dados.cep),fonte:'BrasilAPI',consultadoEm:new Date().toISOString()});
 });return router;
}

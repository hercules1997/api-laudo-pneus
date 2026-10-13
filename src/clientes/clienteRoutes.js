import {Router} from 'express';
import {limparDocumento,validarCnpj} from './documentoFiscal.mjs';
const erro=(status,message)=>Object.assign(new Error(message),{status});
export function criarRotasClientes({requireUser,consultar=fetch}={}){
 const router=Router(),tentativas=new Map();router.use(requireUser);
 router.get('/cnpj/:documento',async(req,res)=>{
  const cnpj=limparDocumento(req.params.documento);if(!validarCnpj(cnpj))throw erro(400,'CNPJ inválido. Confira os dígitos.');
  const agora=Date.now(),recentes=(tentativas.get(req.authUser.id)||[]).filter(data=>agora-data<60000);if(recentes.length>=10)throw erro(429,'Aguarde um minuto antes de fazer novas consultas.');recentes.push(agora);tentativas.set(req.authUser.id,recentes);if(tentativas.size>1000)tentativas.clear();
  let dados,fonte,naoEncontrado=false;
  for(const base of [{url:'https://minhareceita.org/',nome:'Minha Receita',timeout:5500},{url:'https://brasilapi.com.br/api/cnpj/v1/',nome:'BrasilAPI',timeout:3500}]){
   try{const resposta=await consultar(base.url+cnpj,{signal:AbortSignal.timeout(base.timeout),headers:{Accept:'application/json'}});if(resposta.status===404)naoEncontrado=true;if(!resposta.ok)continue;const cadastro=await resposta.json();if(typeof cadastro.razao_social!=='string'||!cadastro.razao_social.trim())continue;dados=cadastro;fonte=base.nome;break;}catch{/* Outra fonte pode atender quando a primeira estiver indisponível. */}
  }
  if(!dados)throw erro(naoEncontrado?404:503,naoEncontrado?'CNPJ não encontrado. Confira o número ou preencha manualmente.':'Consulta indisponível no momento. Os dados podem ser preenchidos manualmente.');
  const texto=valor=>typeof valor==='string'?valor.trim():'';
  res.set('Cache-Control','no-store').json({documento:cnpj,tipo:'cnpj',nome:texto(dados.razao_social),nomeFantasia:texto(dados.nome_fantasia),email:texto(dados.email),telefone:texto(dados.ddd_telefone_1),endereco:[dados.descricao_tipo_de_logradouro,dados.logradouro,dados.numero,dados.complemento].map(texto).filter(Boolean).join(' '),bairro:texto(dados.bairro),cidade:texto(dados.municipio),uf:texto(dados.uf),cep:texto(dados.cep),fonte,consultadoEm:new Date().toISOString()});
 });return router;
}

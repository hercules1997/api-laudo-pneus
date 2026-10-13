import test from 'node:test';
import assert from 'node:assert/strict';
import {validarContatosProposta} from '../src/documents/contatosProposta.js';
const usuario={name:'Consultor',email:'consultor@example.test',telefone:'11999999999'};
const contato={nome:usuario.name,email:usuario.email,telefone:usuario.telefone};
test('contatos cadastrados são aceitos e alterações pelo formulário são bloqueadas',async()=>{
 await validarContatosProposta({contatos:[contato]},usuario);
 for(const campo of ['nome','email','telefone'])await assert.rejects(validarContatosProposta({contatos:[{...contato,[campo]:'alterado'}]},usuario),{status:409});
});
test('gestor selecionado precisa estar ativo e pertencer à unidade',async()=>{
 const gestor={id:'gestor',name:'Gestor',email:'gestor@example.test',telefone:'11888888888',role:'gestor',unitIds:['unidade'],active:true};
 const payload={unidade:'unidade',gestorId:gestor.id,contatos:[contato,{nome:gestor.name,email:gestor.email,telefone:gestor.telefone}]};
 await validarContatosProposta(payload,usuario,async()=>[gestor]);
 await assert.rejects(validarContatosProposta(payload,usuario,async()=>[{...gestor,unitIds:['outra']}]),{status:400});
 await assert.rejects(validarContatosProposta(payload,usuario,async()=>[{...gestor,active:false}]),{status:400});
 await assert.rejects(validarContatosProposta({...payload,contatos:[contato]},usuario,async()=>[gestor]),{status:409});
});

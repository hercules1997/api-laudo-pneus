import {createHash} from 'node:crypto';
import {catalogs} from '../data/catalogos.js';
import {neonConfigured,query} from '../config/neon.js';
export const normalizarCatalogo=valor=>String(valor||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');
export const identificadorMedida=(slug,valor)=>createHash('sha256').update(slug+'|'+normalizarCatalogo(valor)).digest('hex').slice(0,24);
export function itensBase(tipo){return tipo==='marcas'?structuredClone(catalogs.marcas):catalogs.medidas.flatMap(grupo=>grupo.data.map(item=>({_id:identificadorMedida(grupo.slug,item.value),slug:grupo.slug,title:grupo.title,label:item.label,value:item.value,ativo:grupo.ativo!==false})));}
export async function listarCatalogo(tipo){const base=itensBase(tipo);if(!neonConfigured())return base;const alteracoes=await query('SELECT dados FROM app_catalogos WHERE tipo=$1',[tipo]);const itens=new Map(base.map(item=>[item._id,item]));for(const {dados} of alteracoes)itens.set(dados._id,dados);return [...itens.values()];}
export async function catalogoAtual(tipo){const itens=(await listarCatalogo(tipo)).filter(item=>item.ativo!==false);if(tipo==='marcas')return itens;return catalogs.medidas.map(grupo=>({...grupo,data:itens.filter(item=>item.slug===grupo.slug).map(item=>({label:item.label,value:item.value}))}));}

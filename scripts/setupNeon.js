import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {database,query} from '../src/config/neon.js';import {units} from '../src/auth/unitPolicy.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
try{
 const arquivos=(await fs.readdir(path.join(root,'migrations'))).filter(nome=>nome.endsWith('.sql')).sort();
 const schema=(await Promise.all(arquivos.map(nome=>fs.readFile(path.join(root,'migrations',nome),'utf8')))).join('\n-- migration-step\n');
 await database().transaction(schema.split('-- migration-step').map(statement=>database().query(statement.trim(),[])));
 for(const unit of units)await query('INSERT INTO app_units(id,name,state) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING',[unit.id,unit.name,unit.state]);
 const usersPath=process.argv.find(arg=>arg.startsWith('--users='))?.slice(8);
 if(usersPath){const imported=JSON.parse(await fs.readFile(path.resolve(usersPath),'utf8'));if(!Array.isArray(imported.users))throw new Error('Arquivo de usuários inválido.');const existing=await query('SELECT id FROM app_users LIMIT 1');if(existing.length)throw new Error('Contas já existentes serão preservadas. Importação inicial não executada.');const revision=await query('SELECT revision FROM app_auth_revision WHERE singleton=true');await query('SELECT app_replace_users($1::bigint,$2::jsonb)',[revision[0].revision,JSON.stringify(imported.users.map(user=>({...user,unitIds:user.unitIds||[]})))]);console.log('Contas importadas preservando hashes, senhas definitivas e indicadores de primeiro acesso.');}
 const counts=await query('SELECT (SELECT count(*) FROM app_units) AS units,(SELECT count(*) FROM app_users) AS users');console.log('Banco inicializado. Unidades: '+counts[0].units+'; contas: '+counts[0].users+'.');
}catch(error){console.error(error.status?'Não foi possível inicializar o banco. Confira a conexão e as migrações.':error.message);process.exitCode=1;}

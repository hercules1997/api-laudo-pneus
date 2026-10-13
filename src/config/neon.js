import {neon} from '@neondatabase/serverless';
let sql;
export function neonConfigured(){return !!process.env.DATABASE_URL;}
export function neonAuthEnabled(){return neonConfigured()&&process.env.AUTH_STORAGE==='neon';}
export function database(){if(!neonConfigured())throw Object.assign(new Error('Conexão Neon ainda não configurada.'),{status:503});return sql||(sql=neon(process.env.DATABASE_URL));}
export async function query(text,params=[]){try{return await database().query(text,params);}catch(error){if(error.code==='40001'||error.code==='23505')throw Object.assign(new Error('Os dados mudaram em outra sessão. Atualize e tente novamente.'),{status:409});throw Object.assign(new Error('Não foi possível acessar o banco. Confira a configuração e as migrações.'),{status:503});}}

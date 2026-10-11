import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {randomUUID} from 'node:crypto';
import {hashPassword,checkPassword,createSession,decodeSession} from '../src/auth/passwords.js';
import {createAuthRouter} from '../src/auth/authRoutes.js';
import {createGithubUsers} from '../src/auth/githubUsers.js';
process.env.AUTH_JWT_SECRET='test-only-key-123456789012345678901234567890';
async function fixture(run){
 const initial={id:randomUUID(),username:'admin',name:'Administrador de teste',role:'admin',active:true,passwordHash:await hashPassword('SenhaDeTeste12345!'),sessionVersion:1,mustChangePassword:false};
 let data={version:1,users:[initial]},version=1;
 const store={async read(){return {data:structuredClone(data),sha:String(version)};},async write(snapshot){assert.equal(snapshot.sha,String(version));data=structuredClone(snapshot.data);version++;}};
 const app=express();app.use(express.json());app.use('/auth',createAuthRouter(store).router);
 app.use((error,req,res,next)=>res.status(error.status||500).json({message:error.message}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+server.address().port;
 const request=(path,method='GET',body,token)=>fetch(base+'/auth'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
 try{await run({request,initial,getData:()=>data});}finally{await new Promise(r=>server.close(r));}
}
test('scrypt e sessões rejeitam senhas, adulteração e expiração',async()=>{
 const hash=await hashPassword('SenhaDeTeste12345!');assert.ok(!hash.includes('SenhaDeTeste'));
 assert.equal(await checkPassword('SenhaDeTeste12345!',hash),true);
 assert.equal(await checkPassword('OutraSenha12345!',hash),false);
 const token=createSession({id:'u',sessionVersion:3},1000000);
 assert.equal(decodeSession(token,1000001).version,3);
 assert.throws(()=>decodeSession(token+'x',1000001));
 assert.throws(()=>decodeSession(token,1000000+3600001));
 await assert.rejects(hashPassword('curta'));
});
test('login, administração e suspensão invalidam a sessão do usuário',async()=>fixture(async({request,getData})=>{
 const logged=await request('/login','POST',{username:'admin',password:'SenhaDeTeste12345!'});assert.equal(logged.status,200);
 const {accessToken:admin,user}=await logged.json();assert.ok(!('passwordHash' in user));
 const created=await request('/users','POST',{username:'consultor',name:'Consultor',password:'OutraSenha12345!',role:'consultor'},admin);assert.equal(created.status,201);
 const account=await created.json();assert.equal(account.mustChangePassword,true);
 const login=await (await request('/login','POST',{username:'consultor',password:'OutraSenha12345!'})).json();
 assert.equal((await request('/users','GET',null,login.accessToken)).status,403);
 assert.equal((await request('/me','GET',null,login.accessToken)).status,200);
 assert.equal((await request('/users/'+account.id,'PATCH',{active:false},admin)).status,200);
 assert.equal((await request('/me','GET',null,login.accessToken)).status,401);
 assert.equal((await request('/login','POST',{username:'consultor',password:'OutraSenha12345!'})).status,403);
 assert.equal(getData().users.length,2);
}));
test('troca obrigatória de senha e logout revogam tokens anteriores',async()=>fixture(async({request,initial})=>{
 const logged=await (await request('/login','POST',{username:'admin',password:'SenhaDeTeste12345!'})).json();
 const changed=await request('/password','POST',{currentPassword:'SenhaDeTeste12345!',newPassword:'NovaSenhaMuitoLonga123!'},logged.accessToken);assert.equal(changed.status,200);
 const next=await changed.json();assert.equal((await request('/me','GET',null,logged.accessToken)).status,401);
 assert.equal((await request('/users/'+initial.id,'PATCH',{active:false},next.accessToken)).status,400);
 assert.equal((await request('/logout','POST',null,next.accessToken)).status,204);
 assert.equal((await request('/me','GET',null,next.accessToken)).status,401);
}));
test('bloqueio persistente após cinco tentativas incorretas',async()=>fixture(async({request,getData})=>{
 for(let n=0;n<5;n++)assert.equal((await request('/login','POST',{username:'admin',password:'SenhaErrada12345!'})).status,401);
 assert.ok(getData().users[0].lockedUntil>Date.now());
 assert.equal((await request('/login','POST',{username:'admin',password:'SenhaDeTeste12345!'})).status,429);
}));
test('cadastro GitHub recusa repositório público e conflitos não sobrescrevem dados',async()=>{
 process.env.AUTH_GITHUB_REPO='test/acessos';process.env.AUTH_GITHUB_TOKEN='test-token';
 const store=createGithubUsers(async()=>({ok:true,json:async()=>({private:false})}));
 await assert.rejects(store.read(),/precisa ser privado/);
 const responses=[{private:true},{sha:'abc',content:Buffer.from('{"users":[]}').toString('base64')}];
 const privateStore=createGithubUsers(async()=>({ok:true,json:async()=>responses.shift()}));
 const snapshot=await privateStore.read();assert.equal(snapshot.sha,'abc');
});

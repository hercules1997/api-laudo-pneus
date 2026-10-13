import {query} from '../config/neon.js';
import {validarContato} from './contatos.js';
import {Router} from 'express';
import {randomUUID} from 'node:crypto';
import {createGithubUsers,authConfigured} from './githubUsers.js';
import {hashPassword,checkPassword,createSession,decodeSession} from './passwords.js';
import {neonAuthEnabled} from '../config/neon.js';
import {createNeonUsers} from './neonUsers.js';
import {validateUnitIds,units} from './unitPolicy.js';
const expose=u=>({id:u.id,username:u.username,name:u.name,role:u.role,email:u.email||'',telefone:u.telefone||'',unitIds:u.unitIds||[],active:u.active!==false,mustChangePassword:u.mustChangePassword===true});
const session=u=>({accessToken:createSession(u),refreshToken:createSession(u,Date.now(),'refresh'),expiresIn:3600,user:expose(u)});
const fail=(status,message)=>Object.assign(new Error(message),{status});
const normalize=v=>String(v||'').trim().toLowerCase();
function validateAccount(body){
  if(!/^[a-z0-9._-]{3,80}$/.test(normalize(body.username)))throw fail(400,'Usuário deve ter 3 a 80 caracteres: letras, números, ponto, hífen ou sublinhado.');
  if(!['admin','consultor','gestor','leitor'].includes(body.role||'consultor'))throw fail(400,'Perfil inválido.');
  if(typeof body.name!=='string'||!body.name.trim()||body.name.length>100)throw fail(400,'Informe o nome.');
}
export function createAuthRouter(store=neonAuthEnabled()?createNeonUsers():createGithubUsers()) {
  const router=Router();
  router.use((req,res,next)=>{res.set('Cache-Control','no-store');next();});
  const recent=new Map();
  router.post('/login',async(req,res)=>{
    const address=req.get('x-nf-client-connection-ip')||req.ip;
    const now=Date.now(), attempts=recent.get(address)||[];
    const current=attempts.filter(t=>now-t<60000);
    if(current.length>=10)throw fail(429,'Muitas tentativas. Aguarde um minuto.');
    current.push(now);recent.set(address,current);
    if(recent.size>1000)recent.clear();
    const username=normalize(req.body?.username),password=req.body?.password;
    if(typeof password!=='string'||password.length>256)throw fail(401,'Usuário ou senha inválidos.');
    let snapshot=await store.read();
    const user=snapshot.data.users.find(u=>u.username===username);
    if(user?.lockedUntil>Date.now())throw fail(429,'Muitas tentativas. Aguarde alguns minutos.');
    const valid=user?await checkPassword(password,user.passwordHash):await checkPassword(password,'scrypt$00000000000000000000000000000000$'+'0'.repeat(128));
    if(!user||!valid){
      if(user){
        user.failedAttempts=(user.failedAttempts||0)+1;
        if(user.failedAttempts>=5)user.lockedUntil=Date.now()+15*60000;
        await store.write(snapshot,'Registrar falha de autenticação');
      }
      throw fail(401,'Usuário ou senha inválidos.');
    }
    if(user.active===false)throw fail(403,'Seu acesso está suspenso. Fale com o administrador.');
    if(user.failedAttempts||user.lockedUntil){
      user.failedAttempts=0;user.lockedUntil=0;await store.write(snapshot,'Limpar bloqueio de autenticação');
    }
    res.json(session(user));
  });
  async function requireUser(req,res,next){
    const token=req.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
    const claims=decodeSession(token);
    const snapshot=await store.read();
    const user=snapshot.data.users.find(u=>u.id===claims.sub);
    if(!user||user.active===false||(user.sessionVersion||1)!==claims.version)throw fail(401,'Seu acesso mudou. Entre novamente.');
    req.authUser=user;req.authSnapshot=snapshot;next();
  }
  router.get('/status',(req,res)=>res.json({configured:neonAuthEnabled()||authConfigured(),storage:neonAuthEnabled()?'neon-postgresql':'github-private-json'}));
  router.get('/units',requireUser,(req,res)=>res.json(units));
  router.get('/gestores',requireUser,(req,res)=>{const unitId=req.query.unitId;if(typeof unitId!=='string'||!units.some(unit=>unit.id===unitId))throw fail(400,'Selecione uma unidade válida.');if(req.authUser.role!=='admin'&&!req.authUser.unitIds?.includes(unitId))throw fail(403,'Unidade não autorizada.');res.json(req.authSnapshot.data.users.filter(user=>user.active!==false&&user.role==='gestor'&&user.unitIds?.includes(unitId)).map(user=>({id:user.id,name:user.name,email:user.email||'',telefone:user.telefone||''})));});
  router.get('/me',requireUser,(req,res)=>res.json({user:expose(req.authUser)}));
  router.post('/refresh',requireUser,(req,res)=>res.json(session(req.authUser)));
  router.post('/resume',async(req,res)=>{
    const claims=decodeSession(req.body?.refreshToken,Date.now(),'refresh');
    const snapshot=await store.read();const user=snapshot.data.users.find(u=>u.id===claims.sub);
    if(!user||user.active===false||(user.sessionVersion||1)!==claims.version)throw fail(401,'Seu acesso mudou. Entre novamente.');
    // Keep the refresh token's original 30-day expiry rather than extending it on every refresh.
    res.json({accessToken:createSession(user),refreshToken:req.body.refreshToken,expiresIn:3600,user:expose(user)});
  });
  router.post('/logout',requireUser,async(req,res)=>{
    if(neonAuthEnabled())await query('DELETE FROM app_dispositivos WHERE usuario_id=$1',[req.authUser.id]);
    req.authUser.sessionVersion=(req.authUser.sessionVersion||1)+1;
    await store.write(req.authSnapshot,'Encerrar sessões do usuário');res.status(204).end();
  });
  router.post('/password',requireUser,async(req,res)=>{
    if(!await checkPassword(req.body?.currentPassword,req.authUser.passwordHash))throw fail(401,'Senha atual incorreta.');
    req.authUser.passwordHash=await hashPassword(req.body?.newPassword);
    req.authUser.mustChangePassword=false;req.authUser.sessionVersion=(req.authUser.sessionVersion||1)+1;
    await store.write(req.authSnapshot,'Alterar senha');
    res.json(session(req.authUser));
  });
  const requireAdmin=(req,res,next)=>{
    if(req.authUser.role!=='admin'||req.authUser.mustChangePassword)throw fail(403,'Acesso exclusivo de administrador com senha atualizada.');
    next();
  };
  router.get('/users',requireUser,requireAdmin,(req,res)=>res.json(req.authSnapshot.data.users.map(expose)));
  router.post('/users',requireUser,requireAdmin,async(req,res)=>{
    const body=req.body||{};validateAccount(body);const contato=validarContato(body);if(!/^\d{6}$/.test(body.password||''))throw fail(400,'Use uma senha numérica de 6 dígitos.');
    if(req.authSnapshot.data.users.some(u=>u.username===normalize(body.username)))throw fail(409,'Usuário já cadastrado.');
    const unitIds=validateUnitIds(body.unitIds||[]);
    if(neonAuthEnabled()&&['consultor','gestor'].includes(body.role||'consultor')&&!unitIds.length)throw fail(400,'Selecione ao menos uma unidade para o consultor ou gestor.');
    const user={id:randomUUID(),username:normalize(body.username),name:body.name.trim(),role:body.role||'consultor',...contato,unitIds,active:true,passwordHash:await hashPassword(body.password),sessionVersion:1,mustChangePassword:true};
    req.authSnapshot.data.users.push(user);await store.write(req.authSnapshot,'Cadastrar usuário');res.status(201).json(expose(user));
  });
  router.patch('/users/:id',requireUser,requireAdmin,async(req,res)=>{
    const body=req.body||{},user=req.authSnapshot.data.users.find(u=>u.id===req.params.id);
    if(!user)throw fail(404,'Usuário não encontrado.');
    if(Object.keys(body).some(k=>!['active','role','name','password','unitIds','email','telefone'].includes(k)))throw fail(400,'Campo não permitido.');
    if(body.unitIds!==undefined)validateUnitIds(body.unitIds);
    const mudouAcesso=(body.role!==undefined&&body.role!==user.role)||(body.active!==undefined&&body.active!==user.active)||(body.unitIds!==undefined&&JSON.stringify([...body.unitIds].sort())!==JSON.stringify([...(user.unitIds||[])].sort()))||!!body.password;
    if(body.unitIds!==undefined)validateUnitIds(body.unitIds);
    const contato=['email','telefone','name','role'].some(key=>body[key]!==undefined)?validarContato({...user,...body}):null;
    if(body.active!==undefined&&typeof body.active!=='boolean')throw fail(400,'active deve ser booleano.');
    if(body.role!==undefined&&!['admin','consultor','gestor','leitor'].includes(body.role))throw fail(400,'Perfil inválido.');
    if(body.name!==undefined&&(typeof body.name!=='string'||!body.name.trim()||body.name.length>100))throw fail(400,'Nome inválido.');
    if(user.id===req.authUser.id&&(body.active===false||(body.role&&body.role!=='admin')))throw fail(400,'Não é permitido suspender ou remover seu próprio perfil de administrador.');
    if(neonAuthEnabled()&&['consultor','gestor'].includes(body.role||user.role)&&!(body.unitIds||user.unitIds||[]).length)throw fail(400,'Selecione ao menos uma unidade para o consultor ou gestor.');
    if(contato)Object.assign(user,contato);
    if(body.name!==undefined)user.name=body.name.trim();
    if(body.role!==undefined)user.role=body.role;
    if(body.active!==undefined)user.active=body.active;
    if(body.unitIds!==undefined)user.unitIds=body.unitIds;
    if(body.password&&!/^\d{6}$/.test(body.password))throw fail(400,'Use uma senha numérica de 6 dígitos.');
    if(body.password){user.passwordHash=await hashPassword(body.password);user.failedAttempts=0;user.lockedUntil=0;}
    if(mudouAcesso)user.sessionVersion=(user.sessionVersion||1)+1;
    await store.write(req.authSnapshot,'Atualizar acesso de usuário');res.json(expose(user));
  });
  return {router,requireUser};
}

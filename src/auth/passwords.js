import { randomBytes, scrypt, timingSafeEqual, createHmac } from 'node:crypto';
import { promisify } from 'node:util';
const derive=promisify(scrypt);
export async function hashPassword(password) {
  if(typeof password!=='string'||password.length<6||password.length>256) throw Object.assign(new Error('A senha deve ter entre 6 e 256 caracteres.'),{status:400});
  const salt=randomBytes(16).toString('hex');
  const hash=await derive(password,salt,64,{N:16384,r:8,p:1,maxmem:64*1024*1024});
  return 'scrypt$'+salt+'$'+hash.toString('hex');
}
export async function checkPassword(password, encoded) {
  const [scheme,salt,hash]=String(encoded||'').split('$');
  if(scheme!=='scrypt'||!/^\w{32}$/.test(salt||'')||!/^[a-f0-9]{128}$/.test(hash||'')||typeof password!=='string'||password.length>256) return false;
  const actual=await derive(password,salt,64,{N:16384,r:8,p:1,maxmem:64*1024*1024});
  return timingSafeEqual(actual,Buffer.from(hash,'hex'));
}
function secret() {
  const key=process.env.AUTH_JWT_SECRET;
  if(!key||key.length<32) throw Object.assign(new Error('Configure AUTH_JWT_SECRET no Netlify.'),{status:503});
  return key;
}
export function createSession(user,now=Date.now(),kind='access') {
  const header=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
  const payload=Buffer.from(JSON.stringify({iss:'fm-pneus-api',kind,sub:user.id,version:user.sessionVersion||1,iat:Math.floor(now/1000),exp:Math.floor(now/1000)+(kind==='refresh'?30*86400:3600)})).toString('base64url');
  const signature=createHmac('sha256',secret()).update(header+'.'+payload).digest('base64url');
  return header+'.'+payload+'.'+signature;
}
export function decodeSession(token,now=Date.now(),kind='access') {
  try {
    if(typeof token!=='string'||token.length>4096) throw new Error();
    const [head,body,sig,...extra]=token.split('.');
    const expected=createHmac('sha256',secret()).update(head+'.'+body).digest();
    const actual=Buffer.from(sig||'','base64url');
    if(extra.length||actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new Error();
    const h=JSON.parse(Buffer.from(head,'base64url')),p=JSON.parse(Buffer.from(body,'base64url'));
    if(h.alg!=='HS256'||p.iss!=='fm-pneus-api'||(p.kind||'access')!==kind||!p.sub||!Number.isInteger(p.exp)||p.exp<=Math.floor(now/1000)||p.iat>Math.floor(now/1000)+60)throw new Error();
    return p;
  }catch(error){if(error.status===503)throw error;throw Object.assign(new Error('Sessão expirada ou inválida.'),{status:401});}
}

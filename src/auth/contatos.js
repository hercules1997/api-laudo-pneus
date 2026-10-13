const erro=mensagem=>Object.assign(new Error(mensagem),{status:400});
export function validarContato(dados){
 const email=String(dados.email||'').trim(),telefone=String(dados.telefone||'').trim();
 const obrigatorio=['consultor','gestor'].includes(dados.role||'consultor');
 if((obrigatorio||email)&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254))throw erro('Informe um e-mail válido.');
 const digitos=telefone.replace(/\D/g,'');
 if((obrigatorio||telefone)&&(digitos.length<10||digitos.length>15||telefone.length>40))throw erro('Informe um telefone válido com DDD.');
 return {email:email.toLowerCase(),telefone};
}

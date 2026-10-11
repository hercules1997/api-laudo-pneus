const config=()=>({
  repo:process.env.AUTH_GITHUB_REPO,
  token:process.env.AUTH_GITHUB_TOKEN,
  branch:process.env.AUTH_GITHUB_BRANCH||'main',
  path:process.env.AUTH_GITHUB_PATH||'users.json'
});
export function authConfigured(){
  const c=config();return !!(c.repo&&c.token&&process.env.AUTH_JWT_SECRET?.length>=32);
}
export function createGithubUsers(fetcher=fetch) {
  let privacyCheckedUntil=0;
  async function request(url,options={}) {
    const c=config();
    if(!authConfigured()||!/^[-\w.]+\/[-\w.]+$/.test(c.repo)||c.path.includes('..'))throw Object.assign(new Error('Login ainda não configurado no Netlify.'),{status:503});
    const response=await fetcher('https://api.github.com/repos/'+c.repo+url,{
      ...options,headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+c.token,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json',...options.headers},
      signal:AbortSignal.timeout(8000)
    });
    if(!response.ok)throw Object.assign(new Error(response.status===409?'Cadastro alterado por outra sessão. Tente novamente.':'Não foi possível acessar o cadastro privado.'),{status:response.status===409?409:503});
    return response.json();
  }
  return {
    async read(){
      const c=config();
      if(Date.now()>privacyCheckedUntil){
        const repo=await request('');
        if(repo.private!==true)throw Object.assign(new Error('O repositório de usuários precisa ser privado.'),{status:503});
        privacyCheckedUntil=Date.now()+60000;
      }
      const file=await request('/contents/'+c.path.split('/').map(encodeURIComponent).join('/')+'?ref='+encodeURIComponent(c.branch));
      const data=JSON.parse(Buffer.from(file.content,'base64').toString('utf8'));
      if(!Array.isArray(data.users)||data.users.length>500)throw Object.assign(new Error('Cadastro privado inválido.'),{status:503});
      return {data,sha:file.sha};
    },
    async write(snapshot,message){
      const c=config();
      await request('/contents/'+c.path.split('/').map(encodeURIComponent).join('/'),{
        method:'PUT',body:JSON.stringify({message,sha:snapshot.sha,branch:c.branch,content:Buffer.from(JSON.stringify(snapshot.data,null,2)+'\n').toString('base64')})
      });
    }
  };
}

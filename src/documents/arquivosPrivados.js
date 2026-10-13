import {AwsClient} from 'aws4fetch';
import {createHash} from 'node:crypto';

const erro=(status,message)=>Object.assign(new Error(message),{status});
export function armazenamentoConfigurado(){
  return !!(process.env.STORAGE_ENDPOINT&&process.env.STORAGE_ACCESS_KEY_ID&&process.env.STORAGE_SECRET_ACCESS_KEY&&process.env.STORAGE_BUCKET);
}
export function criarArquivosPrivados(cliente=null){
  function conectar(){return cliente||new AwsClient({accessKeyId:process.env.STORAGE_ACCESS_KEY_ID,secretAccessKey:process.env.STORAGE_SECRET_ACCESS_KEY,service:'s3',region:process.env.STORAGE_REGION||'us-east-2'});}
  function endereco(chave){
    if(!armazenamentoConfigurado())throw erro(503,'Armazenamento privado ainda não configurado.');
    if(!/^[A-Za-z0-9_/-]+$/.test(chave)||chave.includes('..'))throw erro(400,'Identificador de arquivo inválido.');
    return process.env.STORAGE_ENDPOINT.replace(/\/+$/,'')+'/'+encodeURIComponent(process.env.STORAGE_BUCKET)+'/'+chave;
  }
  return {
    get ready(){return armazenamentoConfigurado();},
    async put({ownerId,documentId,version,bytes,sha256,contentType='application/pdf'}){
      if(bytes.length>4*1024*1024||createHash('sha256').update(bytes).digest('hex')!==sha256)throw erro(400,'Arquivo inválido ou maior que 4 MB.');
      const key=ownerId+'/'+documentId+'/v'+version+'/'+sha256;
      const resposta=await conectar().fetch(endereco(key),{method:'PUT',body:bytes,headers:{'content-type':contentType}});
      if(!resposta.ok)throw erro(503,'Não foi possível salvar o arquivo no armazenamento privado.');
      return {key,provider:'neon-storage',sha256,size:bytes.length,contentType};
    },
    async read(ref){
      const resposta=await conectar().fetch(endereco(ref.key),{method:'GET'});
      if(!resposta.ok)throw erro(resposta.status===404?404:503,'Arquivo privado indisponível.');
      const bytes=Buffer.from(await resposta.arrayBuffer());
      if(createHash('sha256').update(bytes).digest('hex')!==ref.sha256)throw erro(409,'Arquivo alterado ou corrompido.');
      return bytes;
    }
  };
}

export const documentStatuses=['rascunho','pendente','aprovado','reprovado','reenviado'];
export const documentTypes=['laudo-completo','laudo-destinacao','proposta'];
const clone=value=>JSON.parse(JSON.stringify(value));
const fail=(status,message)=>Object.assign(new Error(message),{status});
const manager=user=>['gestor','admin'].includes(user?.role);
const editor=user=>['consultor','admin'].includes(user?.role);
export function canReadDocument(doc,user){return doc.ownerId===user?.id||(manager(user)&&['pendente','reenviado','aprovado','reprovado'].includes(doc.status)&&(!doc.assignedManagerIds?.length||doc.assignedManagerIds.includes(user.id)));}
export function assertVersion(doc,expectedRevision){if(!Number.isInteger(expectedRevision)||doc.revision!==expectedRevision)throw fail(409,'Documento alterado por outra sessão. Atualize antes de continuar.');}
function audit(doc,action,user,now,notes=''){doc.history.push({action,actorId:user.id,actorRole:user.role,at:now,version:doc.version,revision:doc.revision,notes});return doc;}
export function newDocument({id,type,payload,pdfRef=null},user,now=new Date().toISOString()){
 if(!user?.id||!editor(user))throw fail(403,'Perfil sem permissão para criar documentos.');
 if(!id||!documentTypes.includes(type)||!payload||typeof payload!=='object'||Array.isArray(payload))throw fail(400,'Documento inválido.');
 return audit({id,ownerId:user.id,ownerName:user.name||user.username,type,payload:clone(payload),pdfRef,version:1,revision:1,status:'rascunho',createdAt:now,updatedAt:now,assignedManagerIds:[],versions:[],history:[],notificationEvents:[]},'created',user,now);
}
export function reviseDocument(current,{payload,pdfRef=null,expectedRevision},user,now=new Date().toISOString()){
 assertVersion(current,expectedRevision);if(current.ownerId!==user.id||!editor(user))throw fail(403,'Você só pode editar seus documentos.');
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw fail(400,'Dados inválidos.');
 const doc=clone(current);doc.versions.push({version:doc.version,status:doc.status,payload:doc.payload,pdfRef:doc.pdfRef,decision:doc.decision||null,archivedAt:now});doc.version++;doc.revision++;doc.status='rascunho';doc.payload=clone(payload);doc.pdfRef=pdfRef;doc.updatedAt=now;delete doc.decision;delete doc.submittedAt;
 return audit(doc,'revised',user,now);
}
export function submitDocument(current,{expectedRevision},user,now=new Date().toISOString()){
 assertVersion(current,expectedRevision);if(current.ownerId!==user.id||!editor(user))throw fail(403,'Você só pode enviar seus documentos.');
 if(!['rascunho','reprovado'].includes(current.status))throw fail(409,'Documento já enviado ou aprovado.');
 if(!current.pdfRef?.sha256)throw fail(400,'Gere e envie o PDF desta versão antes de solicitar aprovação.');
 const doc=clone(current);doc.revision++;doc.status=doc.history.some(h=>h.action==='rejected')?'reenviado':'pendente';doc.submittedAt=now;doc.updatedAt=now;return audit(doc,'submitted',user,now);
}
export function decideDocument(current,{expectedRevision,version,approved,notes=''},user,now=new Date().toISOString()){
 assertVersion(current,expectedRevision);if(!manager(user)||!canReadDocument(current,user)||current.ownerId===user.id)throw fail(403,'Gestor não autorizado para analisar este documento.');
 if(version!==current.version||!['pendente','reenviado'].includes(current.status))throw fail(409,'Esta versão não está aguardando análise.');
 if(typeof approved!=='boolean'||typeof notes!=='string'||notes.length>4000||(!approved&&!notes.trim()))throw fail(400,'Informe a decisão e uma justificativa para reprovação.');
 const doc=clone(current);doc.revision++;doc.status=approved?'aprovado':'reprovado';doc.updatedAt=now;doc.decision={managerId:user.id,managerName:user.name||user.username,version:doc.version,approved,notes:notes.trim(),at:now,pdfSha256:doc.pdfRef.sha256};
 doc.notificationEvents.push({id:doc.id+':'+doc.revision,recipientId:doc.ownerId,type:'document-decision',createdAt:now,deliveredAt:null});return audit(doc,approved?'approved':'rejected',user,now,notes.trim());
}
export function assignDocument(current,{expectedRevision,managerIds},user,now=new Date().toISOString()){
 assertVersion(current,expectedRevision);if(user.role!=='admin')throw fail(403,'Distribuição exclusiva do administrador.');
 if(!Array.isArray(managerIds)||!managerIds.every(id=>typeof id==='string'&&id&&id!==current.ownerId))throw fail(400,'Gestores inválidos.');
 const doc=clone(current);doc.assignedManagerIds=[...new Set(managerIds)];doc.revision++;doc.updatedAt=now;return audit(doc,'assigned',user,now);
}
export function canShareDocument(doc,user,{approvalsRequired=true}={}){return canReadDocument(doc,user)&&(!approvalsRequired||(doc.status==='aprovado'&&doc.decision?.version===doc.version&&doc.decision?.pdfSha256===doc.pdfRef?.sha256));}

/** Feature permissions refine roles; they never grant access to another owner's/unit's data. */
export const accessFeatures = [
  {key:'laudoFoto',label:'Laudo com fotos',documentType:'laudo-completo'},
  {key:'destinacao',label:'Laudo de destinação',documentType:'laudo-destinacao'},
  {key:'propostas',label:'Propostas',documentType:'proposta'},
  {key:'analiseSucata',label:'Análise de sucata',readOnly:true},
];
export const featureForDocument = record => {
  const type=record?.remote?.type||record?.documentType||record?.type;
  if(type==='proposta')return 'propostas';
  if(type==='laudo-destinacao'||record?.tipo==='descarte')return 'destinacao';
  return 'laudoFoto';
};
/** Missing policy means a legacy account: preserve all existing feature access. */
export function normalizeFeatureAccess(value) {
  return Object.fromEntries(accessFeatures.map(({key,readOnly})=>{
    const view=value===undefined?true:value?.[key]?.view===true;
    return [key,{view,write:!readOnly&&view&&(value===undefined||value?.[key]?.write===true)}];
  }));
}
export function validateFeatureAccess(value) {
  const invalid=()=>{throw Object.assign(new Error('Permissões inválidas. Revise os recursos e as ações permitidas.'),{status:400});};
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!accessFeatures.some(f=>f.key===k)))invalid();
  for(const [key,access] of Object.entries(value)) {
    if(!access||typeof access!=='object'||Array.isArray(access)||Object.keys(access).some(k=>!['view','write'].includes(k))||typeof access.view!=='boolean'||typeof access.write!=='boolean'||access.write&&!access.view||key==='analiseSucata'&&access.write)invalid();
  }
  return normalizeFeatureAccess(value);
}
export function canUseFeature(user,key,action='view') {
  if(!user?.id||user.active===false||!accessFeatures.some(f=>f.key===key)||!['view','write'].includes(action))return false;
  if(user.role==='admin')return true;
  if(action==='write'&&!['gestor','consultor'].includes(user.role))return false;
  return normalizeFeatureAccess(user.featureAccess)[key][action];
}
export function canAccessDocument(user,record,action='view') {
  return canUseFeature(user,featureForDocument(record),action);
}
export const canViewReports = user => canUseFeature(user,'laudoFoto')||canUseFeature(user,'destinacao');

import units from '../data/units.json' with {type:'json'};
export {units};
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
export function validateUnitIds(ids){if(!Array.isArray(ids)||!ids.every(id=>units.some(u=>u.id===id))||new Set(ids).size!==ids.length)throw Object.assign(new Error('Selecione unidades válidas.'),{status:400});return ids;}
export function documentUnit(payload,user){const name=payload.unidade||payload.dados?.unidade||payload.unitId;const unit=units.find(u=>u.id===name||normalize(u.name)===normalize(name));if(!unit)throw Object.assign(new Error('Selecione a unidade responsável pelo documento.'),{status:400});if(user.role!=='admin'&&!user.unitIds?.includes(unit.id))throw Object.assign(new Error('Você não pertence à unidade deste documento.'),{status:403});return unit.id;}
export function managerInUnit(user,doc){return user?.role==='admin'||user?.role==='gestor'&&!!doc.unitId&&Array.isArray(user.unitIds)&&user.unitIds.includes(doc.unitId);}

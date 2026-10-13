export async function validarContatosProposta(payload,usuario,resolverGestores){
 const esperado=[{nome:usuario.name||'',telefone:usuario.telefone||'',email:usuario.email||''}];
 if(payload.gestorId){const gestores=resolverGestores?await resolverGestores([payload.gestorId]):[];const gestor=gestores[0];if(!gestor||gestor.active===false||gestor.role!=='gestor'||!gestor.unitIds?.includes(payload.unidade))throw Object.assign(new Error('Gestor não autorizado para esta unidade.'),{status:400});esperado.push({nome:gestor.name||'',telefone:gestor.telefone||'',email:gestor.email||''});}
 const contatos=payload.contatos;if(!Array.isArray(contatos)||contatos.length!==esperado.length||esperado.some((pessoa,index)=>['nome','telefone','email'].some(campo=>String(contatos[index]?.[campo]||'')!==pessoa[campo])))throw Object.assign(new Error('Os contatos da proposta devem corresponder aos cadastros. Atualize os dados e gere novamente o PDF.'),{status:409});
}

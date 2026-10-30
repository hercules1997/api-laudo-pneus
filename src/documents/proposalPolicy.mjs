const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** Proposal categories are mutually exclusive; services belong to reform proposals. */
export function proposalCategory(record) {
  const types = new Set((record.itens || []).map(item => item.tipo).filter(type => ['novo', 'reforma'].includes(type)));
  if (types.size > 1) throw new Error('Uma proposta não pode misturar Pneus Novos e Reforma. Separe os documentos.');
  const category = record.tipoProposta || [...types][0] || 'reforma';
  if (!['novo', 'reforma'].includes(category)) throw new Error('Selecione Pneus Novos ou Reforma.');
  return category;
}
export function validateProposalItems(record, {allowLegacy = false} = {}) {
  const category = proposalCategory(record);
  if (!Array.isArray(record.itens) || !record.itens.length) throw new Error('Adicione pelo menos um item à proposta.');
  let total = 0;
  for (const item of record.itens) {
    if ((!item.tipo && !allowLegacy) || (item.tipo && !['novo', 'reforma', 'servico'].includes(item.tipo))) throw new Error('Tipo de item inválido. Selecione o produto ou serviço novamente.');
    if (item.tipo && (category === 'novo' ? item.tipo !== 'novo' : item.tipo === 'novo')) throw new Error('O item não pertence ao tipo desta proposta. Vulcanização e serviços são permitidos somente na Reforma.');
    if (!Number.isInteger(item.quantidade) || item.quantidade < 1 || item.quantidade > 9999 || !Number.isSafeInteger(item.precoCentavos) || item.precoCentavos <= 0 || !Number.isSafeInteger(item.quantidade * item.precoCentavos)) throw new Error('Quantidade ou valor unitário inválido.');
    total += item.quantidade * item.precoCentavos;
    if (!Number.isSafeInteger(total)) throw new Error('O total ultrapassou o limite permitido.');
  }
  return category;
}
/** Translate only catalog positions; an unknown position is never guessed from the model name. */
export function catalogApplication(product) {
  const result = new Set();
  for (const raw of Array.isArray(product?.eixo) ? product.eixo : [product?.eixo]) {
    const value = normalize(raw);
    if (['all axle position', 'todas as posicoes'].includes(value)) return 'Dianteira, Tração e Eixo Livre';
    if (['direcional', 'dianteira', 'steer'].includes(value)) result.add('Dianteira');
    if (['tracao', 'drive'].includes(value)) result.add('Tração');
    if (['livre', 'eixo livre', 'trailer'].includes(value)) result.add('Eixo Livre');
  }
  return [...result].join(', ');
}
export function catalogProposalItems(items, catalog) {
  return items.map(item => {
    if (item.tipo !== 'novo') return {...item};
    const product = catalog.find(product => product.ativo !== false && String(product._id || product.codigo) === String(item.produtoId));
    if (!product || normalize(product.medida).replace(/\s/g, '') !== normalize(item.medida).replace(/\s/g, '')) throw new Error('O modelo ou a medida não está disponível no catálogo. Atualize os catálogos.');
    const aplicacao = catalogApplication(product);
    if (!aplicacao) throw new Error('A aplicação por eixo deste modelo precisa ser cadastrada antes de emitir a proposta.');
    return {...item, descricao: `${product.fabricante} ${product.modelo}`, aplicacao, eixoCatalogo: [...product.eixo]};
  });
}
export function newTireNotes(value) {
  // Remove the old reform-only clause while preserving other commercial observations.
  return String(value || '').replace(/man(?:ch|ç)?[aã]o\s*\/\s*reparos\s*:[^\n]*(?:\n|$)/gi, '').trim();
}

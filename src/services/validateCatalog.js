const required = {
  medidas: ['title','slug'], marcas: ['nome'], bandas: ['codigo','nome','fonte'],
  pneus: ['fabricante','modelo','medida','fonte'],
  avarias: ['codigo','titulo','categoria','aparencia','acao','precaucao']
};
export const keys = { medidas: ['slug'], marcas: ['nome'], bandas: ['codigo'], pneus: ['fabricante','modelo','medida'], avarias: ['codigo'] };
const forbidden = /^(preco|precos|price|prices|valor|valorUnitario|precoUnitario)$/i;
function text(value) { return typeof value === 'string' && value.trim().length > 0; }
function noPrices(value) {
  if (Array.isArray(value)) value.forEach(noPrices);
  else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) {
    if (forbidden.test(key)) throw new Error('Preços não pertencem ao catálogo: ' + key);
    noPrices(item);
  }
}
export function validateCatalog(name, rows) {
  if (!required[name] || !Array.isArray(rows)) throw new Error('Catálogo deve ser um array JSON: ' + name);
  const seen = new Set(), ids = new Set();
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Registro inválido: ' + name);
    noPrices(row);
    for (const field of required[name]) if (!text(row[field])) throw new Error('Campo obrigatório: ' + name + '.' + field);
    const key = JSON.stringify(keys[name].map(field => row[field]));
    if (seen.has(key)) throw new Error('Registro duplicado: ' + name + ' ' + key);
    seen.add(key);
    if (row._id !== undefined) {
      if (typeof row._id !== 'string' || !/^[a-f\d]{24}$/i.test(row._id) || ids.has(row._id)) throw new Error('ID inválido ou duplicado: ' + name);
      ids.add(row._id);
    }
    if (row.ativo !== undefined && typeof row.ativo !== 'boolean') throw new Error('ativo deve ser booleano.');
    if (name === 'medidas') {
      if (!Array.isArray(row.data) || !row.data.length) throw new Error('Categoria de medidas vazia.');
      const values = new Set();
      for (const item of row.data) {
        if (!text(item.label) || !text(item.value) || values.has(item.value)) throw new Error('Medida inválida/duplicada.');
        values.add(item.value);
      }
    }
    if (name === 'bandas' && row.fabricante && row.fabricante !== 'Vipal') throw new Error('Banda deve ser Vipal.');
    if (name === 'pneus' && !['Continental','Royal Black'].includes(row.fabricante)) throw new Error('Fabricante de pneu inválido.');
    for (const field of ['causas','categorias','aplicacao','eixo','medidas']) {
      if (row[field] !== undefined && (!Array.isArray(row[field]) || !row[field].every(text))) throw new Error('Campo deve ser array de textos: ' + field);
    }
    if (name === 'avarias') {
      if (!text(row.fonte?.nome) || !text(row.fonte?.documento) || !Number.isInteger(row.fonte?.pagina) || row.fonte.pagina < 1) throw new Error('Fonte completa obrigatória na avaria.');
      if (!Array.isArray(row.causas)) throw new Error('causas deve ser array.');
      if (row.imagens !== undefined && (!Array.isArray(row.imagens) || row.imagens.filter(i => i.principal).length > 1)) throw new Error('Imagens inválidas.');
      for (const image of row.imagens || []) {
        if (!text(image.url) || !/^(https?:\/\/|\/uploads\/)/.test(image.url)) throw new Error('URL de imagem inválida.');
      }
      if (/PREENCHER|TRANSCRIT[OA] DO DOCUMENTO/.test(JSON.stringify(row))) throw new Error('Substitua os placeholders do template.');
    }
  }
  return rows;
}

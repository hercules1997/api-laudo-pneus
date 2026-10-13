export function bad(message) { return Object.assign(new Error(message), { status: 400 }); }
export function queryString(value, name) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > 200) throw bad('Parâmetro inválido: ' + name);
  return value.trim();
}
function matches(value, query, exact = true) {
  if (Array.isArray(value)) return value.some(item => matches(item, query, exact));
  const target = String(value ?? '').toLowerCase();
  return exact ? target === query.toLowerCase() : target.includes(query.toLowerCase());
}
export function catalogController(rows, filters, searchFields, sortFields) {
  return {
    async list(req, res) {
      const itens=typeof rows==='function'?await rows():rows;
      const values = Object.fromEntries(filters.map(field => [field, queryString(req.query[field], field)]));
      const busca = queryString(req.query.busca, 'busca');
      const result = itens.filter(row => row.ativo !== false &&
        filters.every(field => !values[field] || matches(row[field], values[field])) &&
        (!busca || searchFields.some(field => matches(row[field], busca, false))));
      result.sort((a, b) => {
        for (const field of sortFields) {
          const order = String(a[field] ?? '').localeCompare(String(b[field] ?? ''), 'pt-BR');
          if (order) return order;
        }
        return 0;
      });
      res.json(result);
    },
    async get(req, res) {
      const itens=typeof rows==='function'?await rows():rows;
      if (!/^[a-f\d]{24}$/i.test(req.params.id)) throw bad('ID inválido.');
      const result = itens.find(row => row._id === req.params.id && row.ativo !== false);
      if (!result) return res.status(404).json({ message: 'Registro não encontrado.' });
      res.json(result);
    }
  };
}

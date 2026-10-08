import mongoose from 'mongoose';
export function bad(message) { return Object.assign(new Error(message), { status: 400 }); }
export function queryString(value, name) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > 200) throw bad('Parâmetro inválido: ' + name);
  return value.trim();
}
export function literalRegex(value, exact = false) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(exact ? '^' + escaped + '$' : escaped, 'i');
}
export function body(req, Model) {
  if (!req.body || Array.isArray(req.body) || typeof req.body !== 'object') throw bad('Envie um objeto JSON.');
  for (const key of Object.keys(req.body)) {
    if (['_id','__v','createdAt','updatedAt'].includes(key) || key.includes('.') || (!Model.schema.path(key) && !Model.schema.nested[key])) throw bad('Campo não permitido: ' + key);
  }
  return req.body;
}
function id(req) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) throw bad('ID inválido.');
  return req.params.id;
}
export function catalogController(Model, filters, searchFields) {
  return {
    async list(req, res) {
      const filter = { ativo: true };
      for (const field of filters) {
        const value = queryString(req.query[field], field);
        if (value) filter[field] = literalRegex(value, true);
      }
      const busca = queryString(req.query.busca, 'busca');
      if (busca) filter.$or = searchFields.map(field => ({ [field]: literalRegex(busca) }));
      res.json(await Model.find(filter).sort(Object.fromEntries(filters.filter(f => Model.schema.path(f)?.instance !== 'Array').map(f => [f, 1]))).select('-__v').lean());
    },
    async get(req, res) {
      const result = await Model.findOne({ _id: id(req), ativo: true }).select('-__v').lean();
      if (!result) return res.status(404).json({ message: 'Registro não encontrado.' });
      res.json(result);
    },
    async create(req, res) { res.status(201).json(await Model.create(body(req, Model))); },
    async update(req, res) {
      const result = await Model.findById(id(req));
      if (!result) return res.status(404).json({ message: 'Registro não encontrado.' });
      result.set(body(req, Model)); await result.save(); res.json(result);
    },
    async remove(req, res) {
      const result = await Model.findByIdAndUpdate(id(req), { $set: { ativo: false } }, { new: true });
      if (!result) return res.status(404).json({ message: 'Registro não encontrado.' });
      res.status(204).end();
    }
  };
}

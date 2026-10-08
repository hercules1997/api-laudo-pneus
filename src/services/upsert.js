export async function upsertValidated(Model, rows, keys) {
  if (!Array.isArray(rows)) throw new Error('O arquivo deve conter um array JSON.');
  const documents = rows.map(row => new Model(row));
  const seen = new Set();
  for (const doc of documents) {
    await doc.validate();
    const key = JSON.stringify(keys.map(k => doc.get(k)));
    if (seen.has(key)) throw new Error('Chave duplicada no arquivo: ' + key);
    seen.add(key);
  }
  await Model.init();
  for (const doc of documents) {
    const value = doc.toObject();
    for (const key of ['_id','__v','createdAt','updatedAt']) delete value[key];
    await Model.updateOne(Object.fromEntries(keys.map(k => [k, doc.get(k)])), { $set: value }, { upsert: true, runValidators: true });
  }
  return documents.length;
}

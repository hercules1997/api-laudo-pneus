import mongoose from 'mongoose';
import { requiredString as s, options, active, imageSchema } from './shared.js';
const schema = new mongoose.Schema({
  codigo: { ...s, unique: true }, titulo: s, categoria: s, aparencia: s,
  causas: { type: [String], default: [] }, acao: s, precaucao: s,
  imagens: { type: [imageSchema], default: [], validate: v => v.filter(i => i.principal).length <= 1 },
  fonte: { nome: { ...s, default: 'Vipal' }, documento: s,
    pagina: { type: Number, min: 1, validate: Number.isInteger, required: true },
    url: { type: String, default: '' } }, ativo: active
}, options);
schema.index({ titulo: 'text', aparencia: 'text', causas: 'text' });
export default mongoose.model('Avaria', schema);

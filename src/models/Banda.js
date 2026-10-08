import mongoose from 'mongoose';
import { requiredString as s, optionalString as o, options, active } from './shared.js';
export default mongoose.model('Banda', new mongoose.Schema({
  codigo: { ...s, unique: true }, nome: s,
  fabricante: { type: String, enum: ['Vipal'], default: 'Vipal' },
  aplicacao: [String], eixo: [String], medidas: [String],
  imagem: o, descricao: o, fonte: s, ativo: active
}, options));

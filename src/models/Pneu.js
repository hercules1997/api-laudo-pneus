import mongoose from 'mongoose';
import { requiredString as s, optionalString as o, options, active } from './shared.js';
const schema = new mongoose.Schema({
  fabricante: { ...s, enum: ['Continental', 'Royal Black'] },
  modelo: s, medida: s, indiceCarga: o, indiceVelocidade: o,
  aplicacao: [String], eixo: [String], aro: o, imagem: o,
  descricao: o, fonte: s, ativo: active
}, options);
schema.index({ fabricante: 1, modelo: 1, medida: 1 }, { unique: true });
export default mongoose.model('Pneu', schema);

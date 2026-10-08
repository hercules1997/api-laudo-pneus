import mongoose from 'mongoose';
import { requiredString as s, options, active } from './shared.js';
export default mongoose.model('Marca', new mongoose.Schema({
  nome: { ...s, unique: true }, categorias: [String], ativo: active
}, options));

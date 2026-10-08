import mongoose from 'mongoose';
import { requiredString as s, options, active } from './shared.js';
const item = new mongoose.Schema({ label: s, value: s }, { _id: false, strict: 'throw' });
export default mongoose.model('Medida', new mongoose.Schema({
  title: s, slug: { ...s, unique: true }, ordem: { type: Number, default: 0 },
  data: { type: [item], required: true, validate: v => v.length > 0 && new Set(v.map(i => i.value)).size === v.length },
  ativo: active
}, options));

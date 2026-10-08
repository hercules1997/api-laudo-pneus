import mongoose from 'mongoose';
export const requiredString = { type: String, required: true, trim: true };
export const optionalString = { type: String, trim: true, default: '' };
export const options = { timestamps: true, strict: 'throw' };
export const active = { type: Boolean, default: true };
export const imageSchema = new mongoose.Schema({
  url: { ...requiredString, validate: v => /^(https?:\/\/|\/uploads\/)/.test(v) },
  descricao: optionalString, principal: { type: Boolean, default: false }
}, { _id: false, strict: 'throw' });

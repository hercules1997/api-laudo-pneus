import { timingSafeEqual } from 'node:crypto';
export default function admin(req, res, next) {
  const key = process.env.ADMIN_API_KEY;
  if (!key) return res.status(503).json({ message: 'Escrita desabilitada. Configure ADMIN_API_KEY.' });
  const token = req.get('authorization')?.replace(/^Bearer /, '') || '';
  const a = Buffer.from(key); const b = Buffer.from(token);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return res.status(401).json({ message: 'Credencial administrativa inválida.' });
  next();
}

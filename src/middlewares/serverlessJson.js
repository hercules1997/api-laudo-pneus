// serverless-http preloads req.body as a Buffer. Express 5 sees its stream
// as complete and skips express.json(), so decode that body explicitly.
export default function serverlessJson(req, res, next) {
  if (!Buffer.isBuffer(req.body) || !req.is('application/json')) return next();
  try {
    const limit = /^\/api\/documentos\/[^/]+\/pdf$/.test(req.path) ? 6 * 1024 * 1024 : 1024 * 1024;
    if (req.body.length > limit) throw Object.assign(new Error('Corpo da solicitação excede o limite.'), { status: 413 });
    if (req.get('content-encoding') && req.get('content-encoding') !== 'identity') {
      throw Object.assign(new Error('Codificação do corpo não suportada.'), { status: 415 });
    }
    const text = req.body.toString('utf8');
    const value = text.length ? JSON.parse(text) : {};
    if (value === null || typeof value !== 'object') throw new SyntaxError('JSON deve ser objeto ou array.');
    req.body = value;
    next();
  } catch (error) {
    next(error.status ? error : Object.assign(new Error('JSON inválido.'), { status: 400 }));
  }
}

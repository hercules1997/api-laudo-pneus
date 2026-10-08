export default function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = error.status || 500;
  let message = error.message;
  if (error.code === 11000) { status = 409; message = 'Registro já existe.'; }
  if (['ValidationError', 'CastError', 'StrictModeError'].includes(error.name)) status = 400;
  if (status >= 500) { console.error(error); message = 'Erro interno ao processar a solicitação.'; }
  res.status(status).json({ message });
}

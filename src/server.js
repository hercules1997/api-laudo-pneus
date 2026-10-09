import app from './app.js';
const port = Number(process.env.PORT || 3003);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida.');
const server = app.listen(port, process.env.HOST || '0.0.0.0', () => console.log('API JSON disponível na porta ' + port));
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
for (const signal of ['SIGINT','SIGTERM']) process.once(signal, () => {
  const timer = setTimeout(() => process.exit(1), 10000); timer.unref();
  server.close(() => clearTimeout(timer));
});

import path from 'node:path';
// Scripts npm usam a raiz do projeto; no Netlify a raiz é fornecida pelo runtime.
// Evita import.meta.url, que fica indisponível no bundle CommonJS das Functions.
export const rootDir = path.resolve(process.env.LAMBDA_TASK_ROOT || process.cwd());
export const uploadsDir = path.join(rootDir, 'uploads');

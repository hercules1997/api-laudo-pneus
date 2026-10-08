import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const rootDir = fileURLToPath(new URL('../../', import.meta.url));
export const uploadsDir = path.join(rootDir, 'uploads');

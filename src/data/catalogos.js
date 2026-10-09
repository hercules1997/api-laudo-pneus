import medidas from '../../data/medidas.json' with { type: 'json' };
import marcas from '../../data/marcas.json' with { type: 'json' };
import bandas from '../../data/bandas.json' with { type: 'json' };
import pneus from '../../data/pneus.json' with { type: 'json' };
import avarias from '../../data/avarias.json' with { type: 'json' };
import { validateCatalog } from '../services/validateCatalog.js';
export const catalogs = { medidas, marcas, bandas, pneus, avarias };
for (const [name, rows] of Object.entries(catalogs)) validateCatalog(name, rows);

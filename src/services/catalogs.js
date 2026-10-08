import Medida from '../models/Medida.js';
import Marca from '../models/Marca.js';
import Banda from '../models/Banda.js';
import Pneu from '../models/Pneu.js';
import Avaria from '../models/Avaria.js';
import { medidas } from '../data/medidas.js';
import { marcas } from '../data/marcas.js';
import { bandas } from '../data/bandas.js';
import { pneus } from '../data/pneus.js';
import { avarias } from '../data/avarias.js';
export const catalogs = {
  medidas: { Model: Medida, rows: medidas, keys: ['slug'] },
  marcas: { Model: Marca, rows: marcas, keys: ['nome'] },
  bandas: { Model: Banda, rows: bandas, keys: ['codigo'] },
  pneus: { Model: Pneu, rows: pneus, keys: ['fabricante','modelo','medida'] },
  avarias: { Model: Avaria, rows: avarias, keys: ['codigo'] }
};

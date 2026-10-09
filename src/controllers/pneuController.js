import { catalogs } from '../data/catalogos.js';
import { catalogController } from './catalogController.js';
export default catalogController(catalogs.pneus, ["fabricante","modelo","medida","aplicacao","eixo"], ["fabricante","modelo","descricao"], ["fabricante","modelo","medida"]);

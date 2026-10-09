import { catalogs } from '../data/catalogos.js';
import { catalogController } from './catalogController.js';
export default catalogController(catalogs.bandas, ["codigo","nome","aplicacao","eixo","medidas"], ["codigo","nome","descricao"], ["codigo","nome"]);

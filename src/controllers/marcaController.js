import { catalogs } from '../data/catalogos.js';
import { catalogController } from './catalogController.js';
export default catalogController(catalogs.marcas, ["nome","categorias"], ["nome"], ["nome"]);

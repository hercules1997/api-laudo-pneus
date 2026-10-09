import { catalogs } from '../data/catalogos.js';
import { catalogController } from './catalogController.js';
export default catalogController(catalogs.avarias, ["codigo","categoria"], ["titulo","aparencia","causas"], ["codigo"]);

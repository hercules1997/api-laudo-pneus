import Model from '../models/Avaria.js';
import { catalogController } from './catalogController.js';
export default catalogController(Model, ["codigo","categoria"], ["titulo","aparencia","causas"]);

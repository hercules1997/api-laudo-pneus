import Model from '../models/Marca.js';
import { catalogController } from './catalogController.js';
export default catalogController(Model, ["nome","categorias"], ["nome"]);

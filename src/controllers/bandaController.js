import Model from '../models/Banda.js';
import { catalogController } from './catalogController.js';
export default catalogController(Model, ["codigo","nome","aplicacao","eixo","medidas"], ["codigo","nome","descricao"]);

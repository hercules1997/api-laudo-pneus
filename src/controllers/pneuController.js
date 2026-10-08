import Model from '../models/Pneu.js';
import { catalogController } from './catalogController.js';
export default catalogController(Model, ["fabricante","modelo","medida","aplicacao","eixo"], ["fabricante","modelo","descricao"]);

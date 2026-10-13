import {catalogoAtual} from '../services/catalogosAdministraveis.js';
import { catalogController } from './catalogController.js';
export default catalogController(()=>catalogoAtual('marcas'), ["nome","categorias"], ["nome"], ["nome"]);

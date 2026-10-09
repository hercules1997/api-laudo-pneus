import { Router } from 'express';
export default function catalogRoutes(controller, medidas = false) {
  const router = Router();
  router.get('/', controller.list);
  if (medidas) router.get('/buscar', controller.list);
  router.get('/:id', controller.get);
  const readonly = (req, res) => res.set('Allow', 'GET, HEAD, OPTIONS').status(405).json({
    message: 'Catálogo JSON somente leitura. Edite os arquivos data/*.json e publique novamente.'
  });
  router.all('/', readonly);
  router.all('/:id', readonly);
  return router;
}

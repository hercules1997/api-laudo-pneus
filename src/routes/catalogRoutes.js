import { Router } from 'express';
import admin from '../middlewares/admin.js';
export default function catalogRoutes(controller, medidas = false) {
  const router = Router();
  router.get('/', controller.list);
  if (medidas) router.get('/buscar', controller.list);
  router.get('/:id', controller.get);
  router.post('/', admin, controller.create);
  router.put('/:id', admin, controller.update);
  router.patch('/:id', admin, controller.update);
  router.delete('/:id', admin, controller.remove);
  return router;
}

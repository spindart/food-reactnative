import { Router, Request, Response, NextFunction } from 'express';
import { PedidoController } from '../controllers/pedido.controller';
import { authenticateJWT } from '../services/auth.middleware';
import { validateBody, pedidoSchema } from '../services/validation.middleware';

const router = Router();

router.post('/', authenticateJWT, validateBody(pedidoSchema), async (req, res) => {
  await PedidoController.create(req, res);
});
router.get('/cliente/:clienteId', authenticateJWT, async (req, res) => {
  await PedidoController.listByCliente(req, res);
});
router.get('/estabelecimento/:estabelecimentoId', authenticateJWT, async (req, res) => {
  await PedidoController.listByEstabelecimento(req, res);
});
router.patch('/:id/status', authenticateJWT, async (req, res) => {
  await PedidoController.updateStatus(req, res);
});

export default router;

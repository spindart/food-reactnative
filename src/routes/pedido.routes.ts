import { Router, Request, Response } from 'express';
import { PedidoController } from '../controllers/pedido.controller';
import { authenticateJWT } from '../services/auth.middleware';

const router = Router();

// Confirmação de pedido com cálculo de total e status pendente
router.post('/confirm', async (req, res) => {
  await PedidoController.confirmOrder(req, res);
});

// Criação de pedido
router.post('/', async (req, res) => {
  await PedidoController.create(req, res);
});

// Lista pedidos por cliente
router.get('/cliente/:clienteId', async (req, res) => {
  await PedidoController.listByCliente(req, res);
});

// Lista pedidos por estabelecimento
router.get('/estabelecimento/:estabelecimentoId', async (req, res) => {
  await PedidoController.listByEstabelecimento(req, res);
});

// Atualiza status do pedido
router.patch('/:id/status', async (req, res) => {
  await PedidoController.updateStatus(req, res);
});

// Cancelar pedido com reembolso automático
router.post('/:id/cancel', authenticateJWT, async (req, res) => {
  await PedidoController.cancelOrderWithRefund(req, res);
});

export default router;

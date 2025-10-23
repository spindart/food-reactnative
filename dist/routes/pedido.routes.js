"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pedido_controller_1 = require("../controllers/pedido.controller");
const auth_middleware_1 = require("../services/auth.middleware");
const router = (0, express_1.Router)();
// Confirmação de pedido com cálculo de total e status pendente
router.post('/confirm', async (req, res) => {
    await pedido_controller_1.PedidoController.confirmOrder(req, res);
});
// Criação de pedido
router.post('/', async (req, res) => {
    await pedido_controller_1.PedidoController.create(req, res);
});
// Lista pedidos por cliente
router.get('/cliente/:clienteId', async (req, res) => {
    await pedido_controller_1.PedidoController.listByCliente(req, res);
});
// Lista pedidos por estabelecimento
router.get('/estabelecimento/:estabelecimentoId', async (req, res) => {
    await pedido_controller_1.PedidoController.listByEstabelecimento(req, res);
});
// Atualiza status do pedido
router.patch('/:id/status', async (req, res) => {
    await pedido_controller_1.PedidoController.updateStatus(req, res);
});
// Cancelar pedido com reembolso automático
router.post('/:id/cancel', auth_middleware_1.authenticateJWT, async (req, res) => {
    await pedido_controller_1.PedidoController.cancelOrderWithRefund(req, res);
});
exports.default = router;

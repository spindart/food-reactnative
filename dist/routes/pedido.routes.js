"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pedido_controller_1 = require("../controllers/pedido.controller");
const auth_middleware_1 = require("../services/auth.middleware");
const validation_middleware_1 = require("../services/validation.middleware");
const router = (0, express_1.Router)();
router.post('/', auth_middleware_1.authenticateJWT, (0, validation_middleware_1.validateBody)(validation_middleware_1.pedidoSchema), async (req, res) => {
    await pedido_controller_1.PedidoController.create(req, res);
});
router.get('/cliente/:clienteId', auth_middleware_1.authenticateJWT, async (req, res) => {
    await pedido_controller_1.PedidoController.listByCliente(req, res);
});
router.get('/estabelecimento/:estabelecimentoId', auth_middleware_1.authenticateJWT, async (req, res) => {
    await pedido_controller_1.PedidoController.listByEstabelecimento(req, res);
});
router.patch('/:id/status', auth_middleware_1.authenticateJWT, async (req, res) => {
    await pedido_controller_1.PedidoController.updateStatus(req, res);
});
exports.default = router;

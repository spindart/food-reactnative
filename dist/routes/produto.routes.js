"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const produto_controller_1 = require("../controllers/produto.controller");
const auth_middleware_1 = require("../services/auth.middleware");
const validation_middleware_1 = require("../services/validation.middleware");
const router = (0, express_1.Router)();
router.post('/', auth_middleware_1.authenticateJWT, (0, validation_middleware_1.validateBody)(validation_middleware_1.produtoSchema), async (req, res) => {
    await produto_controller_1.ProdutoController.create(req, res);
});
router.get('/', async (req, res) => {
    await produto_controller_1.ProdutoController.getAll(req, res);
});
router.get('/:id', async (req, res) => {
    await produto_controller_1.ProdutoController.getById(req, res);
});
router.put('/:id', auth_middleware_1.authenticateJWT, (0, validation_middleware_1.validateBody)(validation_middleware_1.produtoSchema), async (req, res) => {
    await produto_controller_1.ProdutoController.update(req, res);
});
router.delete('/:id', auth_middleware_1.authenticateJWT, async (req, res) => {
    await produto_controller_1.ProdutoController.delete(req, res);
});
exports.default = router;

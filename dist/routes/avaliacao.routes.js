"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const avaliacao_controller_1 = require("../controllers/avaliacao.controller");
const router = (0, express_1.Router)();
// Avaliar pedido
router.post('/avaliar', avaliacao_controller_1.AvaliacaoController.avaliarPedido);
exports.default = router;

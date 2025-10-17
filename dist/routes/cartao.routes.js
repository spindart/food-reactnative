"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cartao_controller_1 = require("../controllers/cartao.controller");
const router = (0, express_1.Router)();
// Listar cartões do usuário
router.get('/usuario/:usuarioId', cartao_controller_1.CartaoController.getCartoes);
// Adicionar novo cartão
router.post('/adicionar', cartao_controller_1.CartaoController.adicionarCartao);
// Definir cartão como padrão
router.put('/padrao', cartao_controller_1.CartaoController.definirCartaoPadrao);
// Remover cartão
router.delete('/:cartaoId', cartao_controller_1.CartaoController.removerCartao);
// Obter cartão padrão do usuário
router.get('/padrao/:usuarioId', cartao_controller_1.CartaoController.getCartaoPadrao);
exports.default = router;

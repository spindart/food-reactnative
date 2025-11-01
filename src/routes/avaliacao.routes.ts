import express from 'express';
import { AvaliacaoController } from '../controllers/avaliacao.controller';
import { authenticateJWT } from '../services/auth.middleware';

const router = express.Router();

// Rotas públicas (não requerem autenticação)
// Listar avaliações de um estabelecimento (público)
router.get('/estabelecimento/:estabelecimentoId', AvaliacaoController.listarPorEstabelecimento);

// Listar motivos pré-definidos (público)
router.get('/motivos', AvaliacaoController.listarMotivos);

// Rotas que requerem autenticação
router.use(authenticateJWT);

// Listar avaliações do usuário atual
router.get('/minhas', AvaliacaoController.listarMinhasAvaliacoes);

// Criar avaliação
router.post('/', AvaliacaoController.criar);

// Buscar avaliação por pedido
router.get('/pedido/:pedidoId', AvaliacaoController.buscarPorPedido);

// Listar pedidos que podem ser avaliados
router.get('/para-avaliar', AvaliacaoController.listarParaAvaliar);

// Verificar se pode avaliar um pedido
router.get('/pode-avaliar/:pedidoId', AvaliacaoController.podeAvaliar);

export default router;

import { Router } from 'express';
import { CartaoController } from '../controllers/cartao.controller';

const router = Router();

// Listar cartões do usuário
router.get('/usuario/:usuarioId', CartaoController.getCartoes);

// Adicionar novo cartão
router.post('/adicionar', CartaoController.adicionarCartao);

// Definir cartão como padrão
router.put('/padrao', CartaoController.definirCartaoPadrao);

// Remover cartão
router.delete('/:cartaoId', CartaoController.removerCartao);

// Obter cartão padrão do usuário
router.get('/padrao/:usuarioId', CartaoController.getCartaoPadrao);

export default router;

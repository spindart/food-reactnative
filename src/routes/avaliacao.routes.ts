import { Router } from 'express';
import { AvaliacaoController } from '../controllers/avaliacao.controller';

const router = Router();

// Avaliar pedido
router.post('/avaliar', AvaliacaoController.avaliarPedido);

export default router;

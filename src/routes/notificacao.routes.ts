import { Router } from 'express';
import { NotificacaoController } from '../controllers/notificacao.controller';
import { authenticateJWT } from '../services/auth.middleware';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateJWT);

// GET /api/notificacoes - Lista notificações
router.get('/', NotificacaoController.listarNotificacoes);

// GET /api/notificacoes/nao-lidas - Conta não lidas
router.get('/nao-lidas', NotificacaoController.contarNaoLidas);

// POST /api/notificacoes/:id/marcar-lida - Marca como lida
router.post('/:id/marcar-lida', NotificacaoController.marcarComoLida);

// POST /api/notificacoes/marcar-todas-lidas - Marca todas como lidas
router.post('/marcar-todas-lidas', NotificacaoController.marcarTodasComoLidas);

// DELETE /api/notificacoes/:id - Deleta notificação
router.delete('/:id', NotificacaoController.deletarNotificacao);

// POST /api/notificacoes/token - Salva push token
router.post('/token', NotificacaoController.salvarPushToken);

export default router;


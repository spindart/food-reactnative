import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authenticateJWT } from '../services/auth.middleware';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateJWT);

// GET /api/chat/conversas - Lista conversas do usuário
router.get('/conversas', ChatController.listConversas);

// GET /api/chat/pedido/:pedidoId - Obtém mensagens de uma conversa
router.get('/pedido/:pedidoId', ChatController.getConversa);

// POST /api/chat/pedido/:pedidoId/mensagem - Envia mensagem
router.post('/pedido/:pedidoId/mensagem', ChatController.sendMensagem);

// POST /api/chat/pedido/:pedidoId/marcar-lido - Marca mensagens como lidas
router.post('/pedido/:pedidoId/marcar-lido', ChatController.marcarLido);

// GET /api/chat/templates - Retorna templates de mensagens rápidas
router.get('/templates', ChatController.getTemplates);

export default router;


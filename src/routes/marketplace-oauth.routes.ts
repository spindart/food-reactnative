// Rotas para OAuth do Marketplace
import { Router } from 'express';
import { MarketplaceOAuthController } from '../controllers/marketplace-oauth.controller';
import { authenticateJWT } from '../services/auth.middleware';

const router = Router();

// GET /marketplace/oauth/authorize/:estabelecimentoId
// Gera URL de autorização OAuth
router.get('/authorize/:estabelecimentoId', authenticateJWT, MarketplaceOAuthController.authorize);

// GET /marketplace/oauth/callback
// Callback do OAuth após autorização
router.get('/callback', MarketplaceOAuthController.callback);

// GET /marketplace/oauth/status/:estabelecimentoId
// Verifica status da conexão OAuth
router.get('/status/:estabelecimentoId', authenticateJWT, MarketplaceOAuthController.getStatus);

// POST /marketplace/oauth/disconnect/:estabelecimentoId
// Desconecta conta Mercado Pago
router.post('/disconnect/:estabelecimentoId', authenticateJWT, MarketplaceOAuthController.disconnect);

// POST /marketplace/oauth/refresh/:estabelecimentoId
// Renova access token
router.post('/refresh/:estabelecimentoId', authenticateJWT, MarketplaceOAuthController.refreshToken);

export default router;


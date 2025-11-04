// Rotas para Pagamentos Marketplace com Split
import { Router } from 'express';
import { MarketplacePaymentController } from '../controllers/marketplace-payment.controller';
import { authenticateJWT } from '../services/auth.middleware';

const router = Router();

// POST /marketplace/payment/pix
// Cria pagamento PIX com split
router.post('/pix', MarketplacePaymentController.createPixPayment);

// POST /marketplace/payment/card
// Cria pagamento com cartão e split
router.post('/card', MarketplacePaymentController.createCardPayment);

// POST /marketplace/payment/boleto
// Cria pagamento com boleto e split
router.post('/boleto', MarketplacePaymentController.createBoletoPayment);

// POST /marketplace/payment/refund/:paymentId
// Cria reembolso mantendo split
router.post('/refund/:paymentId', MarketplacePaymentController.createRefund);

// GET /marketplace/transactions/:estabelecimentoId
// Consulta transações por estabelecimento
router.get('/transactions/:estabelecimentoId', authenticateJWT, MarketplacePaymentController.getTransactions);

// GET /marketplace/transactions/:estabelecimentoId/summary
// Resumo financeiro por estabelecimento
router.get('/transactions/:estabelecimentoId/summary', authenticateJWT, MarketplacePaymentController.getSummary);

export default router;


import { Router } from 'express';
import { MercadoPagoService } from '../services/mercadopago.service';

const router = Router();

// POST /pagamento/pix
router.post('/pix', async function(req, res) {
  const { amount, description, payerEmail } = req.body;
  if (!amount || !description || !payerEmail) {
    return res.status(400).json({ error: 'amount, description e payerEmail são obrigatórios' });
  }
  try {
    const pix = await MercadoPagoService.createPixPayment({ amount, description, payerEmail });
    return res.status(200).json(pix);
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
});


// POST /pagamento/cartao
router.post('/cartao', async function(req, res) {
  console.log('Recebido /pagamento/cartao:', req.body);
  const { amount, description, payerEmail, token, installments, paymentMethodId, issuerId } = req.body;
  if (!amount || !description || !payerEmail || !token || !installments || !paymentMethodId) {
    return res.status(400).json({ error: 'amount, description, payerEmail, token, installments e paymentMethodId são obrigatórios' });
  }
  try {
    const payment = await MercadoPagoService.createCardPayment({ amount, description, payerEmail, token, installments, paymentMethodId, issuerId });
    return res.status(200).json(payment);
  } catch (error: any) {
    console.error('Erro Mercado Pago Cartão:', error, error?.response?.data || error?.message);
    return res.status(500).json({ error: error.message });
  }
});

// GET /pagamento/mercadopago/status/:id
router.get('/mercadopago/status/:id', async function(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'paymentId obrigatório' });
  try {
    const status = await MercadoPagoService.getPaymentStatus(id);
    return res.status(200).json(status);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;

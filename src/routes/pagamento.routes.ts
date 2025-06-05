import { Router, Request, Response } from 'express';
import { MercadoPagoService } from '../services/mercadopago.service';

const router = Router();

// POST /pagamento/mercadopago
router.post('/mercadopago', (req, res) => {
  (async () => {
    const { amount, description, payerEmail } = req.body;
    if (!amount || !description || !payerEmail) {
      return res.status(400).json({ error: 'amount, description e payerEmail são obrigatórios' });
    }
    try {
      const payment = await MercadoPagoService.createPayment({ amount, description, payerEmail });
      return res.status(200).json(payment);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  })();
});

// GET /pagamento/mercadopago/status/:id
router.get('/mercadopago/status/:id', (req, res) => {
  (async () => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'paymentId obrigatório' });
    try {
      const status = await MercadoPagoService.getPaymentStatus(id);
      return res.status(200).json(status);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  })();
});

export default router;

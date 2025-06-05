"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mercadopago_service_1 = require("../services/mercadopago.service");
const router = (0, express_1.Router)();
// POST /pagamento/mercadopago
router.post('/mercadopago', (req, res) => {
    (async () => {
        const { amount, description, payerEmail } = req.body;
        if (!amount || !description || !payerEmail) {
            return res.status(400).json({ error: 'amount, description e payerEmail são obrigatórios' });
        }
        try {
            const payment = await mercadopago_service_1.MercadoPagoService.createPayment({ amount, description, payerEmail });
            return res.status(200).json(payment);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    })();
});
// GET /pagamento/mercadopago/status/:id
router.get('/mercadopago/status/:id', (req, res) => {
    (async () => {
        const { id } = req.params;
        if (!id)
            return res.status(400).json({ error: 'paymentId obrigatório' });
        try {
            const status = await mercadopago_service_1.MercadoPagoService.getPaymentStatus(id);
            return res.status(200).json(status);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    })();
});
exports.default = router;

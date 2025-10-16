"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MercadoPagoService = void 0;
const mercadopago_1 = require("mercadopago");
const client = new mercadopago_1.MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
});
class MercadoPagoService {
    static async createPayment({ amount, description, payerEmail }) {
        try {
            const payment = new mercadopago_1.Payment(client);
            const result = await payment.create({
                body: {
                    transaction_amount: amount,
                    description,
                    payment_method_id: 'pix',
                    payer: {
                        email: payerEmail,
                    },
                },
            });
            // O SDK Mercado Pago v2 retorna o pagamento diretamente no result
            return result;
        }
        catch (error) {
            throw new Error(error.message || 'Erro ao criar pagamento Mercado Pago');
        }
    }
    static async getPaymentStatus(paymentId) {
        try {
            const payment = new mercadopago_1.Payment(client);
            const result = await payment.get({ id: paymentId });
            return { status: result.status };
        }
        catch (error) {
            throw new Error(error.message || 'Erro ao consultar status do pagamento Mercado Pago');
        }
    }
}
exports.MercadoPagoService = MercadoPagoService;

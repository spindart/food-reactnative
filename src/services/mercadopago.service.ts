import { MercadoPagoConfig, Payment } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
});

export class MercadoPagoService {
  static async createPayment({ amount, description, payerEmail }: { amount: number; description: string; payerEmail: string }) {
    try {
      const payment = new Payment(client);
      const result = await payment.create({
        body: {
          transaction_amount: amount,
          description,
          payment_method_id: 'pix', // ou 'credit_card', adaptar conforme frontend
          payer: {
            email: payerEmail,
          },
        },
      });
      // O SDK Mercado Pago v2 retorna o pagamento diretamente no result
      return result;
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao criar pagamento Mercado Pago');
    }
  }

  static async getPaymentStatus(paymentId: string) {
    try {
      const payment = new Payment(client);
      const result = await payment.get({ id: paymentId });
      return { status: result.status };
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao consultar status do pagamento Mercado Pago');
    }
  }
}

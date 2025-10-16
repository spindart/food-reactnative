// Removido método duplicado fora da classe
import { MercadoPagoConfig, Payment } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
});

export class MercadoPagoService {
  static async createCardPayment({ amount, description, payerEmail, token, installments, paymentMethodId, issuerId }: {
    amount: number;
    description: string;
    payerEmail: string;
    token: string;
    installments: number;
    paymentMethodId: string;
    issuerId?: number;
  }) {
    try {
      const payment = new Payment(client);
      const result = await payment.create({
        body: {
          transaction_amount: amount,
          description,
          payment_method_id: paymentMethodId,
          payer: {
            email: payerEmail,
          },
          token,
          installments,
          issuer_id: issuerId,
        },
      });
      return {
        paymentId: result.id,
        status: result.status,
        status_detail: result.status_detail,
      };
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao criar pagamento com cartão Mercado Pago');
    }
  }
  static async createPixPayment({ amount, description, payerEmail }: { amount: number; description: string; payerEmail: string }) {
    try {
      const payment = new Payment(client);
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
      // Retorna info PIX: qr_code, qr_code_base64, paymentId
      return {
        paymentId: result.id,
        status: result.status,
        qr_code: result.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
      };
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao criar pagamento PIX Mercado Pago');
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

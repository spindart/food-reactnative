import api from './api';

export async function pagarComMercadoPago({ amount, description, payerEmail }: { amount: number; description: string; payerEmail: string }) {
  const response = await api.post('/pagamento/mercadopago', {
    amount,
    description,
    payerEmail,
  });
  return response.data;
}

export async function consultarStatusPagamento(paymentId: string) {
  const response = await api.get(`/pagamento/mercadopago/status/${paymentId}`);
  return response.data;
}

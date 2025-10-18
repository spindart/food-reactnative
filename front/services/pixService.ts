import api from './api';

export async function iniciarPagamentoPix({ amount, description, payerEmail, pedidoId }: { amount: number; description: string; payerEmail: string; pedidoId?: number }) {
  const response = await api.post('/pagamento/pix', {
    amount,
    description,
    payerEmail,
    pedidoId,
  });
  return response.data;
}

export async function consultarStatusPagamento(paymentId) {
  const response = await api.get(`/pagamento/mercadopago/status/${paymentId}`);
  return response.data;
}

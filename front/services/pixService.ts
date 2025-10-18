import api from './api';

export async function iniciarPagamentoPix({ 
  amount, 
  description, 
  payerEmail, 
  pedidoId,
  payerFirstName,
  payerLastName,
  payerCpf,
  payerAddress
}: { 
  amount: number; 
  description: string; 
  payerEmail: string; 
  pedidoId?: number;
  payerFirstName?: string;
  payerLastName?: string;
  payerCpf?: string;
  payerAddress?: any;
}) {
  const response = await api.post('/pagamento/pix', {
    amount,
    description,
    payerEmail,
    pedidoId,
    payerFirstName,
    payerLastName,
    payerCpf,
    payerAddress,
  });
  return response.data;
}

export async function consultarStatusPagamento(paymentId: string) {
  const response = await api.get(`/pagamento/mercadopago/status/${paymentId}`);
  return response.data;
}

import api from './api';

export interface CardPaymentPayload {
  amount: number;
  description: string;
  payerEmail: string;
  token: string;
  installments: number;
  paymentMethodId: string;
  issuerId?: number;
}

export interface CardPaymentResponse {
  paymentId: string;
  status: string;
  status_detail: string;
}

export async function createCardPayment(payload: CardPaymentPayload) {
    console.log('Chamando createCardPayment', payload);
  const { data } = await api.post<CardPaymentResponse>('/pagamento/cartao', payload);
  return data;
}

export async function getCardPaymentStatus(paymentId: string) {
  const { data } = await api.get<{ status: string; status_detail: string }>(`/pagamento/mercadopago/status/${paymentId}`);
  return data;
}

import api from './api';

export interface CardPaymentPayload {
  amount: number;
  description: string;
  payerEmail: string;
  token: string;
  installments: number;
  paymentMethodId: string;
  issuerId?: number;
  cardNumber?: string; // Adicionado para detecção de bandeira
  pedidoId?: number; // ID do pedido para associar pagamento
}

export interface CardPaymentResponse {
  paymentId: string;
  status: string;
  status_detail: string;
}

export interface CardTokenPayload {
  cardNumber: string;
  cardExp: string;
  cardCvv: string;
  cardName: string;
}

export interface SavedCardTokenPayload {
  cardId: string;
  securityCode: string;
}

export async function generateCardToken(payload: CardTokenPayload) {
  console.log('Chamando generateCardToken', { ...payload, cardNumber: payload.cardNumber.substring(0, 4) + '****' });
  const { data } = await api.post<{ token: string }>('/pagamento/gerar-token-cartao', payload);
  return data.token;
}

export async function generateSavedCardToken(payload: SavedCardTokenPayload) {
  console.log('Chamando generateSavedCardToken', { cardId: payload.cardId, securityCode: '***' });
  const { data } = await api.post<{ token: string }>('/pagamento/gerar-token-cartao-salvo', payload);
  return data.token;
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

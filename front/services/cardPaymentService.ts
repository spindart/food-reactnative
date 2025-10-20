// Serviço de pagamento com cartão - Checkout Transparente conforme documentação oficial
import api from './api';
import CardManagementService from './cardManagementService';

export interface CardPaymentPayload {
  amount: number;
  description: string;
  payerEmail: string;
  token: string;
  installments: number;
  paymentMethodId: string;
  issuerId?: number;
  cardNumber?: string; // Para detecção de bandeira
  usarCartaoSalvo?: boolean; // Flag para indicar se é cartão salvo
  cartaoId?: number; // ID do cartão salvo no banco local
  securityCode?: string; // CVV para cartões salvos
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

// Gerar token para cartão novo com validação melhorada
export async function generateCardToken(payload: CardTokenPayload): Promise<string> {
  try {
    console.log('🔄 Gerando token para cartão novo:', payload.cardNumber.substring(0, 4) + '****');
    
    // Validar dados do cartão antes de enviar
    const validation = CardManagementService.validateCardData(payload);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }
    
    const { data } = await api.post<{ token: string }>('/pagamento/gerar-token-cartao', payload);
    
    if (!data.token) {
      throw new Error('Token não foi gerado');
    }
    
    console.log('✅ Token gerado com sucesso');
    return data.token;
  } catch (error: any) {
    console.error('❌ Erro ao gerar token:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || error.message || 'Erro ao gerar token do cartão');
  }
}

// Gerar token para cartão salvo
export async function generateSavedCardToken(payload: SavedCardTokenPayload): Promise<string> {
  try {
    console.log('🔄 Gerando token para cartão salvo:', payload.cardId.substring(0, 6) + '****');
    
    if (!payload.cardId || !payload.securityCode) {
      throw new Error('cardId e securityCode são obrigatórios');
    }
    
    const { data } = await api.post<{ token: string }>('/pagamento/gerar-token-cartao-salvo', payload);
    
    if (!data.token) {
      throw new Error('Token não foi gerado');
    }
    
    console.log('✅ Token gerado com sucesso para cartão salvo');
    return data.token;
  } catch (error: any) {
    console.error('❌ Erro ao gerar token do cartão salvo:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || error.message || 'Erro ao gerar token do cartão salvo');
  }
}

// Criar pagamento com cartão com validação melhorada
export async function createCardPayment(payload: CardPaymentPayload): Promise<CardPaymentResponse> {
  try {
    console.log('🔄 Criando pagamento com cartão:', {
      amount: payload.amount,
      description: payload.description,
      payerEmail: payload.payerEmail,
      paymentMethodId: payload.paymentMethodId,
      installments: payload.installments,
      usarCartaoSalvo: payload.usarCartaoSalvo
    });
    
    // Validações básicas
    if (!payload.amount || payload.amount <= 0) {
      throw new Error('Valor do pagamento inválido');
    }
    
    if (!payload.description || !payload.payerEmail || !payload.paymentMethodId) {
      throw new Error('Dados obrigatórios ausentes');
    }
    
    // Para cartão salvo, não precisa de token (será gerado no backend)
    // Mas precisa de cartaoId e securityCode
    if (payload.usarCartaoSalvo) {
      if (!payload.cartaoId || !payload.securityCode) {
        throw new Error('Para cartão salvo, cartaoId e securityCode são obrigatórios');
      }
    } else {
      // Para cartão novo, token é obrigatório
      if (!payload.token) {
        throw new Error('Token do cartão é obrigatório');
      }
    }
    
    if (!payload.installments || payload.installments < 1) {
      throw new Error('Número de parcelas inválido');
    }
    
    // Detectar bandeira se não foi fornecida e temos o número do cartão
    let finalPaymentMethodId = payload.paymentMethodId;
    if (payload.cardNumber && !payload.usarCartaoSalvo) {
      finalPaymentMethodId = CardManagementService.detectCardBrand(payload.cardNumber);
      console.log('🎯 Bandeira detectada:', finalPaymentMethodId);
    }
    
    const { data } = await api.post<CardPaymentResponse>('/pagamento/cartao', {
      ...payload,
      paymentMethodId: finalPaymentMethodId
    });
    
    if (!data.paymentId) {
      throw new Error('Pagamento não foi criado');
    }
    
    console.log('✅ Pagamento com cartão criado:', data.paymentId);
    return data;
  } catch (error: any) {
    console.error('❌ Erro ao criar pagamento com cartão:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || error.message || 'Erro ao criar pagamento com cartão');
  }
}

// Consultar status do pagamento com cartão
export async function getCardPaymentStatus(paymentId: string): Promise<{ status: string; status_detail: string }> {
  try {
    console.log('🔄 Consultando status do pagamento:', paymentId);
    
    if (!paymentId) {
      throw new Error('ID do pagamento é obrigatório');
    }
    
    const { data } = await api.get<{ status: string; status_detail: string }>(`/pagamento/mercadopago/status/${paymentId}`);
    
    console.log('✅ Status consultado:', data.status);
    return data;
  } catch (error: any) {
    console.error('❌ Erro ao consultar status:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || error.message || 'Erro ao consultar status do pagamento');
  }
}

// Método auxiliar para criar pagamento com cartão salvo
export async function createPaymentWithSavedCard(paymentData: {
  amount: number;
  description: string;
  payerEmail: string;
  customerId: string;
  cardId: string;
  securityCode: string;
  installments?: number;
  paymentMethodId?: string;
}): Promise<CardPaymentResponse> {
  try {
    console.log('🔄 Criando pagamento com cartão salvo:', {
      customerId: paymentData.customerId,
      cardId: paymentData.cardId.substring(0, 6) + '****',
      amount: paymentData.amount
    });
    
    const payload: CardPaymentPayload = {
      amount: paymentData.amount,
      description: paymentData.description,
      payerEmail: paymentData.payerEmail,
      token: '', // Será preenchido pelo backend
      installments: paymentData.installments || 1,
      paymentMethodId: paymentData.paymentMethodId || 'visa',
      usarCartaoSalvo: true,
      cartaoId: parseInt(paymentData.cardId), // cardId é o ID do cartão no banco local (não o mercadoPagoCardId)
      securityCode: paymentData.securityCode
    };
    
    return await createCardPayment(payload);
  } catch (error: any) {
    console.error('❌ Erro ao criar pagamento com cartão salvo:', error.message);
    throw error;
  }
}

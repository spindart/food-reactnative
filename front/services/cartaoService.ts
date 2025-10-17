import api from './api';

export interface Cartao {
  id: number;
  usuarioId: number;
  mercadoPagoCardId: string;
  lastFourDigits: string;
  firstSixDigits: string;
  expirationMonth: number;
  expirationYear: number;
  paymentMethodId: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdicionarCartaoPayload {
  usuarioId: number;
  token: string;
  cardNumber: string;
  cardExp: string;
  cardCvv: string;
  cardName: string;
}

// Listar cartões do usuário
export const getCartoes = async (usuarioId: number): Promise<Cartao[]> => {
  try {
    const response = await api.get(`/cartoes/usuario/${usuarioId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao listar cartões:', error);
    throw error;
  }
};

// Adicionar novo cartão
export const adicionarCartao = async (payload: AdicionarCartaoPayload): Promise<{ success: boolean; cartao: Cartao; message: string }> => {
  try {
    const response = await api.post('/cartoes/adicionar', payload);
    return response.data;
  } catch (error) {
    console.error('Erro ao adicionar cartão:', error);
    throw error;
  }
};

// Definir cartão como padrão
export const definirCartaoPadrao = async (cartaoId: number, usuarioId: number): Promise<{ success: boolean; cartao: Cartao; message: string }> => {
  try {
    const response = await api.put('/cartoes/padrao', { cartaoId, usuarioId });
    return response.data;
  } catch (error) {
    console.error('Erro ao definir cartão padrão:', error);
    throw error;
  }
};

// Remover cartão
export const removerCartao = async (cartaoId: number): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.delete(`/cartoes/${cartaoId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao remover cartão:', error);
    throw error;
  }
};

// Obter cartão padrão do usuário
export const getCartaoPadrao = async (usuarioId: number): Promise<Cartao | null> => {
  try {
    const response = await api.get(`/cartoes/padrao/${usuarioId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao obter cartão padrão:', error);
    throw error;
  }
};

// Função auxiliar para formatar cartão para exibição
export const formatarCartao = (cartao: Cartao): string => {
  const bandeira = cartao.paymentMethodId.toUpperCase();
  const ultimosDigitos = cartao.lastFourDigits;
  const mes = cartao.expirationMonth.toString().padStart(2, '0');
  const ano = cartao.expirationYear.toString().slice(-2);
  
  return `${bandeira} ****${ultimosDigitos} (${mes}/${ano})`;
};

// Função auxiliar para obter ícone da bandeira
export const getBandeiraIcon = (paymentMethodId: string): string => {
  switch (paymentMethodId.toLowerCase()) {
    case 'visa':
      return '💳';
    case 'master':
      return '💳';
    case 'amex':
      return '💳';
    case 'elo':
      return '💳';
    case 'hipercard':
      return '💳';
    case 'diners':
      return '💳';
    default:
      return '💳';
  }
};

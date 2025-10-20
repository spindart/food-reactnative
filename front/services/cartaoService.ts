// Serviço de gestão de cartões - Integrado com Checkout Transparente
import api from './api';
import CardManagementService from './cardManagementService';

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
    console.log('🔄 Listando cartões do usuário:', usuarioId);
    const response = await api.get(`/cartoes/usuario/${usuarioId}`);
    console.log('✅ Cartões obtidos:', response.data.length);
    return response.data;
  } catch (error: any) {
    console.error('❌ Erro ao listar cartões:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || error.message || 'Erro ao listar cartões');
  }
};

// Adicionar novo cartão com validação melhorada
export const adicionarCartao = async (payload: AdicionarCartaoPayload): Promise<{ success: boolean; cartao: Cartao; message: string }> => {
  try {
    console.log('🔄 Adicionando cartão:', payload.cardNumber.substring(0, 4) + '****');
    
    // Validar dados do cartão antes de enviar
    const validation = CardManagementService.validateCardData({
      cardNumber: payload.cardNumber,
      cardExp: payload.cardExp,
      cardCvv: payload.cardCvv,
      cardName: payload.cardName
    });
    
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }
    
    // Detectar bandeira do cartão
    const paymentMethodId = CardManagementService.detectCardBrand(payload.cardNumber);
    console.log('🎯 Bandeira detectada:', paymentMethodId);
    
    const response = await api.post('/cartoes/adicionar', {
      ...payload,
      paymentMethodId // Incluir bandeira detectada
    });
    
    console.log('✅ Cartão adicionado com sucesso:', response.data.cartao.id);
    return response.data;
  } catch (error: any) {
    console.error('❌ Erro ao adicionar cartão:', error.response?.data || error.message);
    
    // Tratar erro específico de cartão duplicado
    if (error.response?.status === 400 && error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    
    // Tratar outros erros
    throw new Error(error.response?.data?.message || error.message || 'Erro ao adicionar cartão');
  }
};

// Definir cartão como padrão
export const definirCartaoPadrao = async (cartaoId: number, usuarioId: number): Promise<{ success: boolean; cartao: Cartao; message: string }> => {
  try {
    console.log('🔄 Definindo cartão padrão:', { cartaoId, usuarioId });
    
    const payload = { cartaoId, usuarioId };
    
    const response = await api.put('/cartoes/padrao', payload);
    
    console.log('✅ Cartão definido como padrão:', response.data.cartao.id);
    return response.data;
  } catch (error: any) {
    console.error('❌ Erro ao definir cartão padrão:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || error.message || 'Erro ao definir cartão padrão');
  }
};

// Remover cartão
export const removerCartao = async (cartaoId: number): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('🔄 Removendo cartão:', cartaoId);
    
    const response = await api.delete(`/cartoes/${cartaoId}`);
    
    console.log('✅ Cartão removido com sucesso');
    return response.data;
  } catch (error: any) {
    console.error('❌ Erro ao remover cartão:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || error.message || 'Erro ao remover cartão');
  }
};

// Obter cartão padrão do usuário
export const getCartaoPadrao = async (usuarioId: number): Promise<Cartao | null> => {
  try {
    console.log('🔄 Obtendo cartão padrão do usuário:', usuarioId);
    
    const response = await api.get(`/cartoes/padrao/${usuarioId}`);
    
    console.log('✅ Cartão padrão obtido:', response.data?.id || 'nenhum');
    return response.data;
  } catch (error: any) {
    console.error('❌ Erro ao obter cartão padrão:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || error.message || 'Erro ao obter cartão padrão');
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

// Função auxiliar para obter nome da bandeira
export const getBandeiraNome = (paymentMethodId: string): string => {
  switch (paymentMethodId.toLowerCase()) {
    case 'visa':
      return 'Visa';
    case 'master':
      return 'Mastercard';
    case 'amex':
      return 'American Express';
    case 'elo':
      return 'Elo';
    case 'hipercard':
      return 'Hipercard';
    case 'diners':
      return 'Diners Club';
    default:
      return 'Cartão';
  }
};

// Função auxiliar para validar dados do cartão
export const validarCartao = CardManagementService.validateCardData;

// Função auxiliar para detectar bandeira do cartão
export const detectarBandeira = CardManagementService.detectCardBrand;

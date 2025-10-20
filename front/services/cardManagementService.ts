// Serviço de gestão de cartões - Checkout Transparente conforme documentação oficial
import api from './api';

// Interfaces para tipagem
export interface CardData {
  cardNumber: string;
  cardExp: string;
  cardCvv: string;
  cardName: string;
}

export interface SavedCard {
  id: number;
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

export interface CardTokenResponse {
  token: string;
}

export interface PaymentResponse {
  paymentId: string;
  status: string;
  status_detail: string;
}

export interface CustomerResponse {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

export interface CardValidationResult {
  isValid: boolean;
  errors: string[];
}

class CardManagementService {
  // Validar dados do cartão no frontend
  static validateCardData(cardData: CardData): CardValidationResult {
    const errors: string[] = [];
    
    // Validar número do cartão
    const cleanNumber = cardData.cardNumber.replace(/\s/g, '');
    if (!cleanNumber || cleanNumber.length < 13 || cleanNumber.length > 19) {
      errors.push('Número do cartão inválido');
    }
    
    // Validar data de expiração
    const expParts = cardData.cardExp.split('/');
    if (expParts.length !== 2) {
      errors.push('Formato de data inválido. Use MM/AA');
    } else {
      const expMonth = parseInt(expParts[0], 10);
      const expYear = parseInt(expParts[1], 10);
      
      if (expMonth < 1 || expMonth > 12) {
        errors.push('Mês inválido. Use um valor entre 01 e 12');
      }
      
      const currentYear = new Date().getFullYear() % 100;
      if (expYear < currentYear) {
        errors.push('Cartão expirado');
      }
    }
    
    // Validar CVV
    if (!cardData.cardCvv || cardData.cardCvv.length < 3) {
      errors.push('CVV inválido');
    }
    
    // Validar nome
    if (!cardData.cardName || cardData.cardName.trim().length < 2) {
      errors.push('Nome do portador inválido');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Detectar bandeira do cartão no frontend
  static detectCardBrand(cardNumber: string): string {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    
    if (/^4/.test(cleanNumber)) {
      return 'visa';
    } else if (/^5[1-5]/.test(cleanNumber)) {
      return 'master';
    } else if (/^5067/.test(cleanNumber)) {
      return 'elo';
    } else if (/^3[47]/.test(cleanNumber)) {
      return 'amex';
    } else if (/^6/.test(cleanNumber)) {
      return 'hipercard';
    } else if (/^3[0689]/.test(cleanNumber)) {
      return 'diners';
    }
    
    return 'visa'; // Default fallback
  }

  // Gerar token para cartão novo
  static async generateCardToken(cardData: CardData): Promise<string> {
    try {
      console.log('🔄 Gerando token para cartão novo no frontend');
      
      // Validar dados antes de enviar
      const validation = this.validateCardData(cardData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const response = await api.post('/pagamento/gerar-token-cartao', cardData);
      
      if (!response.data?.token) {
        throw new Error('Token não foi gerado');
      }
      
      console.log('✅ Token gerado com sucesso');
      return response.data.token;
    } catch (error: any) {
      console.error('❌ Erro ao gerar token:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.message || 'Erro ao gerar token do cartão');
    }
  }

  // Gerar token para cartão salvo
  static async generateSavedCardToken(cardId: string, securityCode: string): Promise<string> {
    try {
      console.log('🔄 Gerando token para cartão salvo no frontend');
      
      if (!cardId || !securityCode) {
        throw new Error('cardId e securityCode são obrigatórios');
      }

      const response = await api.post('/pagamento/gerar-token-cartao-salvo', {
        cardId,
        securityCode
      });
      
      if (!response.data?.token) {
        throw new Error('Token não foi gerado');
      }
      
      console.log('✅ Token gerado com sucesso para cartão salvo');
      return response.data.token;
    } catch (error: any) {
      console.error('❌ Erro ao gerar token do cartão salvo:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.message || 'Erro ao gerar token do cartão salvo');
    }
  }

  // Criar pagamento com cartão novo
  static async createCardPayment(paymentData: {
    amount: number;
    description: string;
    payerEmail: string;
    token: string;
    installments: number;
    paymentMethodId: string;
    issuerId?: number;
    cardNumber?: string;
  }): Promise<PaymentResponse> {
    try {
      console.log('🔄 Criando pagamento com cartão novo no frontend');
      
      const response = await api.post('/pagamento/cartao', paymentData);
      
      if (!response.data?.paymentId) {
        throw new Error('Pagamento não foi criado');
      }
      
      console.log('✅ Pagamento com cartão criado:', response.data.paymentId);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao criar pagamento com cartão:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.message || 'Erro ao criar pagamento com cartão');
    }
  }

  // Criar pagamento com cartão salvo
  static async createPaymentWithSavedCard(paymentData: {
    amount: number;
    description: string;
    payerEmail: string;
    customerId: string;
    cardId: string;
    securityCode: string;
    installments?: number;
    paymentMethodId?: string;
  }): Promise<PaymentResponse> {
    try {
      console.log('🔄 Criando pagamento com cartão salvo no frontend');
      
      const response = await api.post('/pagamento/cartao', {
        ...paymentData,
        usarCartaoSalvo: true,
        cartaoId: paymentData.cardId,
        securityCode: paymentData.securityCode
      });
      
      if (!response.data?.paymentId) {
        throw new Error('Pagamento não foi criado');
      }
      
      console.log('✅ Pagamento com cartão salvo criado:', response.data.paymentId);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao criar pagamento com cartão salvo:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.message || 'Erro ao criar pagamento com cartão salvo');
    }
  }

  // Consultar status do pagamento
  static async getPaymentStatus(paymentId: string): Promise<{ status: string; status_detail?: string }> {
    try {
      console.log('🔄 Consultando status do pagamento:', paymentId);
      
      const response = await api.get(`/pagamento/mercadopago/status/${paymentId}`);
      
      console.log('✅ Status consultado:', response.data.status);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao consultar status:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.message || 'Erro ao consultar status do pagamento');
    }
  }

  // Criar customer no MercadoPago
  static async createCustomer(email: string, additionalData?: { first_name?: string; last_name?: string }): Promise<CustomerResponse> {
    try {
      console.log('🔄 Criando customer no frontend:', email);
      
      const response = await api.post('/customers', {
        email,
        ...additionalData
      });
      
      console.log('✅ Customer criado:', response.data.id);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao criar customer:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.message || 'Erro ao criar customer');
    }
  }

  // Buscar customer por email
  static async searchCustomerByEmail(email: string): Promise<CustomerResponse> {
    try {
      console.log('🔄 Buscando customer por email:', email);
      
      const response = await api.get(`/customers/search?email=${encodeURIComponent(email)}`);
      
      console.log('✅ Customer encontrado:', response.data.id);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao buscar customer:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.message || 'Erro ao buscar customer');
    }
  }

  // Adicionar cartão ao customer
  static async addCardToCustomer(customerId: string, token: string, paymentMethodId?: string): Promise<any> {
    try {
      console.log('🔄 Adicionando cartão ao customer:', customerId);
      
      const response = await api.post(`/customers/${customerId}/cards`, {
        token,
        paymentMethodId
      });
      
      console.log('✅ Cartão adicionado:', response.data.id);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao adicionar cartão:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.message || 'Erro ao adicionar cartão');
    }
  }

  // Listar cartões do customer
  static async getCustomerCards(customerId: string): Promise<any[]> {
    try {
      console.log('🔄 Listando cartões do customer:', customerId);
      
      const response = await api.get(`/customers/${customerId}/cards`);
      
      console.log('✅ Cartões obtidos:', response.data.length);
      return response.data || [];
    } catch (error: any) {
      console.error('❌ Erro ao obter cartões:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.message || 'Erro ao obter cartões');
    }
  }

  // Remover cartão do customer
  static async removeCardFromCustomer(customerId: string, cardId: string): Promise<any> {
    try {
      console.log('🔄 Removendo cartão do customer:', customerId, cardId);
      
      const response = await api.delete(`/customers/${customerId}/cards/${cardId}`);
      
      console.log('✅ Cartão removido');
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao remover cartão:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.message || 'Erro ao remover cartão');
    }
  }

  // Método auxiliar: Buscar ou criar customer por email
  static async findOrCreateCustomer(email: string, additionalData?: { first_name?: string; last_name?: string }): Promise<CustomerResponse> {
    try {
      console.log('🔄 Buscando ou criando customer:', email);
      
      try {
        // Tentar buscar customer existente
        return await this.searchCustomerByEmail(email);
      } catch (error: any) {
        // Se não encontrou, criar novo
        console.log('🔄 Customer não encontrado, criando novo...');
        return await this.createCustomer(email, additionalData);
      }
    } catch (error: any) {
      console.error('❌ Erro ao buscar ou criar customer:', error.message);
      throw error;
    }
  }

  // Método auxiliar: Criar customer e cartão em uma operação
  static async createCustomerAndCard(email: string, cardToken: string, paymentMethodId?: string, additionalData?: { first_name?: string; last_name?: string }): Promise<{ customer: CustomerResponse; card: any }> {
    try {
      console.log('🔄 Criando customer e cartão em uma operação:', email);
      
      // Criar ou buscar customer
      let customer;
      try {
        customer = await this.createCustomer(email, additionalData);
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          customer = await this.searchCustomerByEmail(email);
        } else {
          throw error;
        }
      }
      
      // Adicionar cartão ao customer
      const card = await this.addCardToCustomer(customer.id, cardToken, paymentMethodId);
      
      console.log('✅ Customer e cartão criados com sucesso:', { customerId: customer.id, cardId: card.id });
      return { customer, card };
    } catch (error: any) {
      console.error('❌ Erro ao criar customer e cartão:', error.message);
      throw error;
    }
  }
}

export default CardManagementService;


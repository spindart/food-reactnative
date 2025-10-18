// Removido método duplicado fora da classe
import { MercadoPagoConfig, Payment } from 'mercadopago';
import axios from 'axios';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
});

export class MercadoPagoService {
  // Função para detectar bandeira do cartão
  static detectCardBrand(cardNumber: string): string {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    
    console.log('🔍 Backend detectando bandeira para:', cleanNumber.substring(0, 6) + '****');
    console.log('🔍 Testando regexes no backend:');
    console.log('  /^4/:', /^4/.test(cleanNumber));
    console.log('  /^5[0-5]/:', /^5[0-5]/.test(cleanNumber));
    console.log('  /^5067/:', /^5067/.test(cleanNumber));
    console.log('  /^3[47]/:', /^3[47]/.test(cleanNumber));
    
    if (/^4/.test(cleanNumber)) {
      console.log('✅ Backend detectado: Visa (começa com 4)');
      return 'visa';
    } else if (/^5[0-5]/.test(cleanNumber)) {
      // Verificar se é Elo ou Mastercard
      if (/^5067/.test(cleanNumber)) {
        console.log('✅ Backend detectado: Elo (começa com 5067)');
        return 'elo';
      } else {
        console.log('✅ Backend detectado: Mastercard (começa com 5[0-5])');
        return 'master';
      }
    } else if (/^3[47]/.test(cleanNumber)) {
      console.log('✅ Backend detectado: American Express (começa com 3[47])');
      return 'amex';
    } else if (/^6/.test(cleanNumber)) {
      console.log('✅ Backend detectado: Hipercard (começa com 6)');
      return 'hipercard';
    } else if (/^3[0689]/.test(cleanNumber)) {
      console.log('✅ Backend detectado: Diners (começa com 3[0689])');
      return 'diners';
    }
    
    console.log('⚠️ Backend: Bandeira não detectada, usando Visa como padrão');
    return 'visa'; // Default fallback
  }

  static async generateSavedCardToken({ cardId, securityCode }: {
    cardId: string;
    securityCode: string;
  }) {
    try {
      console.log('Gerando token para cartão salvo:', { 
        cardId: cardId.substring(0, 6) + '****', 
        securityCode: '***' 
      });

      const body = {
        card_id: cardId,
        security_code: securityCode
      };

      const MERCADO_PAGO_PUBLIC_KEY = process.env.MERCADO_PAGO_PUBLIC_KEY;
      if (!MERCADO_PAGO_PUBLIC_KEY) {
        throw new Error('MERCADO_PAGO_PUBLIC_KEY não encontrada');
      }

      const response = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${MERCADO_PAGO_PUBLIC_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro na API MercadoPago (cartão salvo):', errorData);
        throw new Error(`Erro ao gerar token do cartão salvo: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      console.log('Token gerado com sucesso para cartão salvo:', data.id);
      return data.id;
    } catch (error: any) {
      console.error('Erro ao gerar token do cartão salvo:', error);
      throw new Error(error.message || 'Erro ao gerar token do cartão salvo');
    }
  }

  static async generateCardToken({ cardNumber, cardExp, cardCvv, cardName }: {
    cardNumber: string;
    cardExp: string;
    cardCvv: string;
    cardName: string;
  }) {
    try {
      // Validar e processar data de expiração
      const expParts = cardExp.split('/');
      if (expParts.length !== 2) {
        throw new Error('Formato de data inválido. Use MM/AA');
      }
      
      const expMonth = parseInt(expParts[0], 10);
      const expYear = parseInt(expParts[1], 10);
      
      // Validar mês (1-12)
      if (expMonth < 1 || expMonth > 12) {
        throw new Error('Mês inválido. Use um valor entre 01 e 12');
      }
      
      // Validar ano (deve ser >= ano atual)
      const currentYear = new Date().getFullYear() % 100; // Últimos 2 dígitos
      if (expYear < currentYear) {
        throw new Error('Ano de expiração inválido. Cartão expirado');
      }
      
      const body = {
        card_number: cardNumber.replace(/\s/g, ''),
        expiration_month: expMonth,
        expiration_year: 2000 + expYear, // Converter para ano completo
        security_code: cardCvv,
        cardholder: {
          name: cardName,
        },
      };

      const MERCADO_PAGO_PUBLIC_KEY = process.env.MERCADO_PAGO_PUBLIC_KEY;
      if (!MERCADO_PAGO_PUBLIC_KEY) {
        throw new Error('MERCADO_PAGO_PUBLIC_KEY não encontrada');
      }

      console.log('Gerando token do cartão:', { 
        cardNumber: cardNumber.substring(0, 4) + '****', 
        expMonth, 
        expYear: 2000 + expYear,
        cardName 
      });

      const response = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${MERCADO_PAGO_PUBLIC_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro na API MercadoPago:', errorData);
        throw new Error(`Erro ao gerar token do cartão: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      console.log('Token gerado com sucesso:', data.id);
      return data.id;
    } catch (error: any) {
      console.error('Erro ao gerar token do cartão:', error);
      throw new Error(error.message || 'Erro ao gerar token do cartão');
    }
  }

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
      console.log('Criando pagamento cartão:', { amount, description, payerEmail, paymentMethodId, installments });
      
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
      
      console.log('Pagamento cartão criado com sucesso:', result.id);
      
      return {
        paymentId: result.id,
        status: result.status,
        status_detail: result.status_detail,
      };
    } catch (error: any) {
      console.error('Erro detalhado MercadoPago Cartão:', {
        message: error.message,
        status: error.status,
        response: error.response?.data,
        fullError: error,
        paymentMethodId,
        token: token.substring(0, 10) + '...'
      });
      
      // Tratamento específico para bin_not_found
      if (error.message === 'bin_not_found') {
        throw new Error('Bandeira do cartão não reconhecida. Verifique o número do cartão ou tente outro cartão.');
      }
      
      throw new Error(error.message || 'Erro ao criar pagamento com cartão Mercado Pago');
    }
  }
  static async createPixPayment({ amount, description, payerEmail }: { amount: number; description: string; payerEmail: string }) {
    try {
      console.log('Criando pagamento PIX:', { amount, description, payerEmail });
      
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
      
      console.log('Pagamento PIX criado com sucesso:', result.id);
      
      // Retorna info PIX: qr_code, qr_code_base64, paymentId
      return {
        paymentId: result.id,
        status: result.status,
        qr_code: result.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
      };
    } catch (error: any) {
      console.error('Erro detalhado MercadoPago PIX:', {
        message: error.message,
        status: error.status,
        response: error.response?.data,
        fullError: error
      });
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

  // Criar customer no MercadoPago - CONFORME DOCUMENTAÇÃO OFICIAL
  static async createCustomer(email: string): Promise<any> {
    try {
      console.log('🔄 Criando customer no MercadoPago:', email);
      
      const response = await axios.post(
        'https://api.mercadopago.com/v1/customers',
        { email },
        {
          headers: {
            'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log('✅ Customer criado no MercadoPago:', response.data.id);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao criar customer no MercadoPago:', error.response?.data || error.message);
      
      // Se o customer já existe, buscar e retornar
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
        console.log('🔄 Customer já existe, buscando...');
        return await this.searchCustomerByEmail(email);
      }
      
      throw new Error(`Erro ao criar customer: ${error.response?.data?.message || error.message}`);
    }
  }

  // Buscar customer por email - CONFORME DOCUMENTAÇÃO OFICIAL
  static async searchCustomerByEmail(email: string): Promise<any> {
    try {
      console.log('🔄 Buscando customer por email:', email);
      
      const response = await axios.get(
        `https://api.mercadopago.com/v1/customers/search?email=${encodeURIComponent(email)}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
          },
        }
      );
      
      if (response.data.results && response.data.results.length > 0) {
        console.log('✅ Customer encontrado:', response.data.results[0].id);
        return response.data.results[0];
      } else {
        throw new Error('Customer não encontrado');
      }
    } catch (error: any) {
      console.error('❌ Erro ao buscar customer:', error.response?.data || error.message);
      throw new Error(`Erro ao buscar customer: ${error.response?.data?.message || error.message}`);
    }
  }

  // Buscar customer por ID - CONFORME DOCUMENTAÇÃO OFICIAL
  static async getCustomerById(customerId: string): Promise<any> {
    try {
      console.log('🔄 Buscando customer por ID:', customerId);
      
      const response = await axios.get(
        `https://api.mercadopago.com/v1/customers/${customerId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
          },
        }
      );
      
      console.log('✅ Customer encontrado:', response.data.id);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao buscar customer por ID:', error.response?.data || error.message);
      throw new Error(`Erro ao buscar customer: ${error.response?.data?.message || error.message}`);
    }
  }

  // Modificar customer - CONFORME DOCUMENTAÇÃO OFICIAL
  static async updateCustomer(customerId: string, updateData: { email?: string; first_name?: string; last_name?: string }): Promise<any> {
    try {
      console.log('🔄 Modificando customer:', customerId, updateData);
      
      const response = await axios.put(
        `https://api.mercadopago.com/v1/customers/${customerId}`,
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log('✅ Customer modificado:', response.data.id);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao modificar customer:', error.response?.data || error.message);
      throw new Error(`Erro ao modificar customer: ${error.response?.data?.message || error.message}`);
    }
  }

  // Adicionar cartão ao customer - CONFORME DOCUMENTAÇÃO OFICIAL
  static async addCardToCustomer(customerId: string, token: string, paymentMethodId?: string): Promise<any> {
    try {
      console.log('🔄 Adicionando cartão ao customer:', customerId);
      
      const cardData: any = { token };
      if (paymentMethodId) {
        cardData.payment_method_id = paymentMethodId;
      }
      
      const response = await axios.post(
        `https://api.mercadopago.com/v1/customers/${customerId}/cards`,
        cardData,
        {
          headers: {
            'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log('✅ Cartão adicionado ao customer:', response.data.id);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao adicionar cartão ao customer:', error.response?.data || error.message);
      throw new Error(`Erro ao adicionar cartão: ${error.response?.data?.message || error.message}`);
    }
  }

  // Listar cartões do customer - CONFORME DOCUMENTAÇÃO OFICIAL
  static async getCustomerCards(customerId: string): Promise<any[]> {
    try {
      console.log('🔄 Listando cartões do customer:', customerId);
      
      const response = await axios.get(
        `https://api.mercadopago.com/v1/customers/${customerId}/cards`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
          },
        }
      );
      
      console.log('✅ Cartões obtidos do customer:', response.data.length);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao obter cartões do customer:', error.response?.data || error.message);
      throw new Error(`Erro ao obter cartões: ${error.response?.data?.message || error.message}`);
    }
  }

  // Remover cartão do customer - CONFORME DOCUMENTAÇÃO OFICIAL
  static async removeCardFromCustomer(customerId: string, cardId: string): Promise<any> {
    try {
      console.log('🔄 Removendo cartão do customer:', customerId, cardId);
      
      const response = await axios.delete(
        `https://api.mercadopago.com/v1/customers/${customerId}/cards/${cardId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
          },
        }
      );
      
      console.log('✅ Cartão removido do customer');
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao remover cartão do customer:', error.response?.data || error.message);
      throw new Error(`Erro ao remover cartão: ${error.response?.data?.message || error.message}`);
    }
  }

  // Criar pagamento com cartão salvo - CONFORME DOCUMENTAÇÃO OFICIAL
  static async createPaymentWithSavedCard(paymentData: {
    amount: number;
    description: string;
    payerEmail: string;
    customerId: string;
    cardId: string; // ID do cartão salvo no MercadoPago
    securityCode: string; // CVV fornecido pelo usuário
    installments?: number;
    paymentMethodId?: string;
  }): Promise<any> {
    try {
      console.log('🔍 Criando pagamento com cartão salvo (conforme documentação oficial):', {
        customerId: paymentData.customerId,
        cardId: paymentData.cardId.substring(0, 6) + '****',
        amount: paymentData.amount
      });

      // Verificar se o customer existe usando o método correto
      try {
        await this.getCustomerById(paymentData.customerId);
        console.log('✅ Customer encontrado:', paymentData.customerId);
      } catch (customerError: any) {
        console.error('❌ Customer não encontrado:', customerError.message);
        throw new Error('Customer não encontrado no MercadoPago');
      }

      // MÉTODO OFICIAL: Gerar token com card_id + security_code conforme documentação
      console.log('🔄 Gerando token para cartão salvo conforme documentação oficial...');
      
      const tokenResponse = await axios.post(
        'https://api.mercadopago.com/v1/card_tokens',
        {
          card_id: paymentData.cardId,
          security_code: paymentData.securityCode
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const token = tokenResponse.data.id;
      console.log('✅ Token gerado para cartão salvo:', token);

      // Criar pagamento com token gerado + payer.type: 'customer'
      console.log('🔄 Criando pagamento com cartão salvo...');
      
      const payment = {
        transaction_amount: paymentData.amount,
        description: paymentData.description,
        token: token,
        installments: paymentData.installments || 1,
        payer: {
          type: 'customer',
          id: paymentData.customerId
        }
      };

      console.log('📤 Payload oficial enviado para MercadoPago:', JSON.stringify(payment, null, 2));

      const response = await axios.post(
        'https://api.mercadopago.com/v1/payments',
        payment,
        {
          headers: {
            'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          },
        }
      );

      console.log('✅ Pagamento criado com cartão salvo:', response.data.id);
      return {
        paymentId: response.data.id,
        status: response.data.status,
        status_detail: response.data.status_detail,
      };

    } catch (error: any) {
      console.error('❌ Erro ao criar pagamento com cartão salvo:', error.response?.data || error.message);
      console.error('❌ Status:', error.response?.status);
      
      // Tratamento específico para erros conhecidos
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.message?.includes('invalid_card_id')) {
          throw new Error('Cartão não encontrado ou inválido');
        } else if (errorData.message?.includes('invalid_security_code')) {
          throw new Error('Código de segurança inválido');
        } else if (errorData.message?.includes('customer_not_found')) {
          throw new Error('Cliente não encontrado');
        }
      }
      
      throw new Error(`Erro ao processar pagamento: ${error.response?.data?.message || error.message}`);
    }
  }

  // Método auxiliar: Criar customer e cartão em uma operação - CONFORME DOCUMENTAÇÃO OFICIAL
  static async createCustomerAndCard(email: string, cardToken: string, paymentMethodId?: string): Promise<{ customer: any; card: any }> {
    try {
      console.log('🔄 Criando customer e cartão em uma operação:', email);
      
      // Criar ou buscar customer
      let customer;
      try {
        customer = await this.createCustomer(email);
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

  // Método auxiliar: Buscar ou criar customer por email
  static async findOrCreateCustomer(email: string): Promise<any> {
    try {
      console.log('🔄 Buscando ou criando customer:', email);
      
      try {
        // Tentar buscar customer existente
        return await this.searchCustomerByEmail(email);
      } catch (error: any) {
        // Se não encontrou, criar novo
        console.log('🔄 Customer não encontrado, criando novo...');
        return await this.createCustomer(email);
      }
    } catch (error: any) {
      console.error('❌ Erro ao buscar ou criar customer:', error.message);
      throw error;
    }
  }
}

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MercadoPagoService = void 0;
// Serviço MercadoPago - Checkout Transparente conforme documentação oficial
const mercadopago_1 = require("mercadopago");
const axios_1 = __importDefault(require("axios"));
// Configuração do cliente MercadoPago
const client = new mercadopago_1.MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
});
class MercadoPagoService {
    // Detecção de bandeira do cartão - CONFORME DOCUMENTAÇÃO OFICIAL
    static detectCardBrand(cardNumber) {
        const cleanNumber = cardNumber.replace(/\s/g, '');
        // Validação básica do número do cartão
        if (!cleanNumber || cleanNumber.length < 13 || cleanNumber.length > 19) {
            throw new Error('Número do cartão inválido');
        }
        console.log('🔍 Detectando bandeira para:', cleanNumber.substring(0, 6) + '****');
        // Detecção baseada nos primeiros dígitos conforme documentação oficial
        if (/^4/.test(cleanNumber)) {
            console.log('✅ Detectado: Visa');
            return 'visa';
        }
        else if (/^5[1-5]/.test(cleanNumber)) {
            console.log('✅ Detectado: Mastercard');
            return 'master';
        }
        else if (/^5067/.test(cleanNumber)) {
            console.log('✅ Detectado: Elo');
            return 'elo';
        }
        else if (/^3[47]/.test(cleanNumber)) {
            console.log('✅ Detectado: American Express');
            return 'amex';
        }
        else if (/^6/.test(cleanNumber)) {
            console.log('✅ Detectado: Hipercard');
            return 'hipercard';
        }
        else if (/^3[0689]/.test(cleanNumber)) {
            console.log('✅ Detectado: Diners Club');
            return 'diners';
        }
        console.log('⚠️ Bandeira não detectada, usando Visa como padrão');
        return 'visa'; // Default fallback
    }
    // Validação de dados do cartão conforme documentação
    static validateCardData(cardData) {
        const errors = [];
        // Validar número do cartão
        if (!cardData.cardNumber || cardData.cardNumber.replace(/\s/g, '').length < 13) {
            errors.push('Número do cartão inválido');
        }
        // Validar data de expiração
        const expParts = cardData.cardExp.split('/');
        if (expParts.length !== 2) {
            errors.push('Formato de data inválido. Use MM/AA');
        }
        else {
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
    // Gerar token para cartão salvo - CONFORME DOCUMENTAÇÃO OFICIAL
    static async generateSavedCardToken({ cardId, securityCode }) {
        try {
            console.log('🔄 Gerando token para cartão salvo:', {
                cardId: cardId.substring(0, 6) + '****',
                securityCode: '***'
            });
            // Validações básicas
            if (!cardId || !securityCode) {
                throw new Error('cardId e securityCode são obrigatórios');
            }
            if (securityCode.length < 3) {
                throw new Error('CVV inválido');
            }
            const MERCADO_PAGO_PUBLIC_KEY = process.env.MERCADO_PAGO_PUBLIC_KEY;
            if (!MERCADO_PAGO_PUBLIC_KEY) {
                throw new Error('MERCADO_PAGO_PUBLIC_KEY não configurada');
            }
            const requestData = {
                card_id: cardId,
                security_code: securityCode
            };
            const response = await axios_1.default.post(`https://api.mercadopago.com/v1/card_tokens?public_key=${MERCADO_PAGO_PUBLIC_KEY}`, requestData, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'FoodApp/1.0'
                },
                timeout: 10000 // 10 segundos de timeout
            });
            if (!response.data?.id) {
                throw new Error('Token não foi gerado pela API do MercadoPago');
            }
            console.log('✅ Token gerado com sucesso para cartão salvo:', response.data.id);
            return response.data.id;
        }
        catch (error) {
            console.error('❌ Erro ao gerar token do cartão salvo:', error.response?.data || error.message);
            // Tratamento específico para erros conhecidos
            if (error.response?.status === 400) {
                const errorData = error.response.data;
                if (errorData.message?.includes('invalid_card_id')) {
                    throw new Error('Cartão não encontrado ou inválido');
                }
                else if (errorData.message?.includes('invalid_security_code')) {
                    throw new Error('Código de segurança inválido');
                }
            }
            throw new Error(error.message || 'Erro ao gerar token do cartão salvo');
        }
    }
    // Gerar token para cartão novo - CONFORME DOCUMENTAÇÃO OFICIAL
    static async generateCardToken({ cardNumber, cardExp, cardCvv, cardName }) {
        try {
            console.log('🔄 Gerando token para cartão novo:', {
                cardNumber: cardNumber.substring(0, 4) + '****',
                cardExp,
                cardName
            });
            // Validar dados do cartão usando método interno
            const validation = this.validateCardData({ cardNumber, cardExp, cardCvv, cardName });
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }
            // Processar data de expiração
            const expParts = cardExp.split('/');
            const expMonth = parseInt(expParts[0], 10);
            const expYear = parseInt(expParts[1], 10);
            const MERCADO_PAGO_PUBLIC_KEY = process.env.MERCADO_PAGO_PUBLIC_KEY;
            if (!MERCADO_PAGO_PUBLIC_KEY) {
                throw new Error('MERCADO_PAGO_PUBLIC_KEY não configurada');
            }
            const requestData = {
                card_number: cardNumber.replace(/\s/g, ''),
                expiration_month: expMonth,
                expiration_year: 2000 + expYear, // Converter para ano completo
                security_code: cardCvv,
                cardholder: {
                    name: cardName.trim(),
                },
            };
            const response = await axios_1.default.post(`https://api.mercadopago.com/v1/card_tokens?public_key=${MERCADO_PAGO_PUBLIC_KEY}`, requestData, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'FoodApp/1.0'
                },
                timeout: 10000 // 10 segundos de timeout
            });
            if (!response.data?.id) {
                throw new Error('Token não foi gerado pela API do MercadoPago');
            }
            console.log('✅ Token gerado com sucesso:', response.data.id);
            return response.data.id;
        }
        catch (error) {
            console.error('❌ Erro ao gerar token do cartão:', error.response?.data || error.message);
            // Tratamento específico para erros conhecidos
            if (error.response?.status === 400) {
                const errorData = error.response.data;
                if (errorData.message?.includes('invalid_card_number')) {
                    throw new Error('Número do cartão inválido');
                }
                else if (errorData.message?.includes('invalid_expiration_month')) {
                    throw new Error('Mês de expiração inválido');
                }
                else if (errorData.message?.includes('invalid_expiration_year')) {
                    throw new Error('Ano de expiração inválido');
                }
                else if (errorData.message?.includes('invalid_security_code')) {
                    throw new Error('Código de segurança inválido');
                }
            }
            throw new Error(error.message || 'Erro ao gerar token do cartão');
        }
    }
    // Criar pagamento com cartão - CONFORME DOCUMENTAÇÃO OFICIAL
    static async createCardPayment({ amount, description, payerEmail, token, installments, paymentMethodId, issuerId }) {
        try {
            console.log('🔄 Criando pagamento com cartão:', {
                amount,
                description,
                payerEmail,
                paymentMethodId,
                installments
            });
            // Validações básicas
            if (!amount || amount <= 0) {
                throw new Error('Valor do pagamento inválido');
            }
            if (!description || !payerEmail || !token || !paymentMethodId) {
                throw new Error('Dados obrigatórios ausentes');
            }
            if (!installments || installments < 1) {
                throw new Error('Número de parcelas inválido');
            }
            // Gerar chave de idempotência única
            const idempotencyKey = `card-payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const paymentData = {
                transaction_amount: amount,
                description,
                payment_method_id: paymentMethodId,
                payer: {
                    email: payerEmail,
                },
                token,
                installments,
                issuer_id: issuerId,
                additional_info: {
                    items: [{
                            id: 'food-order',
                            title: description,
                            description: 'Pedido de comida',
                            quantity: 1,
                            unit_price: amount,
                            category_id: 'food'
                        }]
                }
            };
            const payment = new mercadopago_1.Payment(client);
            const result = await payment.create({
                body: paymentData,
                requestOptions: {
                    idempotencyKey: idempotencyKey,
                },
            });
            console.log('✅ Pagamento com cartão criado:', {
                paymentId: result.id,
                status: result.status,
                status_detail: result.status_detail
            });
            return {
                paymentId: result.id?.toString() || '',
                status: result.status || 'unknown',
                status_detail: result.status_detail || 'unknown',
            };
        }
        catch (error) {
            console.error('❌ Erro ao criar pagamento com cartão:', {
                message: error.message,
                status: error.status,
                response: error.response?.data,
                paymentMethodId,
                token: token.substring(0, 10) + '...'
            });
            // Tratamento específico para erros conhecidos
            if (error.message === 'bin_not_found') {
                throw new Error('Bandeira do cartão não reconhecida. Verifique o número do cartão ou tente outro cartão.');
            }
            if (error.response?.status === 400) {
                const errorData = error.response.data;
                if (errorData.message?.includes('invalid_token')) {
                    throw new Error('Token do cartão inválido ou expirado');
                }
                else if (errorData.message?.includes('insufficient_amount')) {
                    throw new Error('Valor insuficiente para o pagamento');
                }
            }
            throw new Error(error.message || 'Erro ao criar pagamento com cartão');
        }
    }
    // Criar pagamento PIX - CONFORME DOCUMENTAÇÃO OFICIAL
    static async createPixPayment({ amount, description, payerEmail, payerFirstName, payerLastName, payerCpf, payerAddress }) {
        try {
            console.log('🔄 Criando pagamento PIX:', { amount, description, payerEmail });
            // Validações básicas
            if (!amount || amount <= 0) {
                throw new Error('Valor do pagamento inválido');
            }
            if (!description || !payerEmail) {
                throw new Error('Descrição e email do pagador são obrigatórios');
            }
            // Preparar dados do payer conforme documentação oficial
            const payerData = {
                email: payerEmail,
            };
            // Adicionar dados opcionais se fornecidos
            if (payerFirstName)
                payerData.first_name = payerFirstName;
            if (payerLastName)
                payerData.last_name = payerLastName;
            // Adicionar identificação (CPF) se fornecida
            if (payerCpf) {
                payerData.identification = {
                    type: "CPF",
                    number: payerCpf.replace(/\D/g, '') // Remove formatação
                };
            }
            // Adicionar endereço se fornecido
            if (payerAddress) {
                payerData.address = payerAddress;
            }
            // Gerar chave de idempotência única
            const idempotencyKey = `pix-payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const paymentData = {
                transaction_amount: amount,
                description,
                payment_method_id: 'pix',
                payer: payerData,
                // Data de expiração: 10 minutos (conforme solicitado)
                date_of_expiration: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
                additional_info: {
                    items: [{
                            id: 'food-order',
                            title: description,
                            description: 'Pedido de comida',
                            quantity: 1,
                            unit_price: amount,
                            category_id: 'food'
                        }]
                }
            };
            const payment = new mercadopago_1.Payment(client);
            const result = await payment.create({
                body: paymentData,
                requestOptions: {
                    idempotencyKey: idempotencyKey,
                },
            });
            console.log('✅ Pagamento PIX criado:', {
                paymentId: result.id,
                status: result.status,
                qrCodeAvailable: !!result.point_of_interaction?.transaction_data?.qr_code
            });
            // Retorna info PIX conforme documentação oficial
            return {
                paymentId: result.id?.toString() || '',
                status: result.status || 'unknown',
                status_detail: result.status_detail || 'unknown',
                qr_code: result.point_of_interaction?.transaction_data?.qr_code,
                qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
                ticket_url: result.point_of_interaction?.transaction_data?.ticket_url,
                transaction_id: result.point_of_interaction?.transaction_data?.transaction_id,
                date_of_expiration: result.date_of_expiration,
            };
        }
        catch (error) {
            console.error('❌ Erro ao criar pagamento PIX:', {
                message: error.message,
                status: error.status,
                response: error.response?.data
            });
            // Tratamento específico para erros conhecidos
            if (error.response?.status === 400) {
                const errorData = error.response.data;
                if (errorData.message?.includes('invalid_email')) {
                    throw new Error('Email do pagador inválido');
                }
                else if (errorData.message?.includes('invalid_amount')) {
                    throw new Error('Valor do pagamento inválido');
                }
            }
            throw new Error(error.message || 'Erro ao criar pagamento PIX');
        }
    }
    // Consultar status do pagamento - CONFORME DOCUMENTAÇÃO OFICIAL
    static async getPaymentStatus(paymentId) {
        try {
            if (!paymentId) {
                throw new Error('ID do pagamento é obrigatório');
            }
            console.log('🔄 Consultando status do pagamento:', paymentId);
            const payment = new mercadopago_1.Payment(client);
            const result = await payment.get({ id: paymentId });
            console.log('✅ Status do pagamento consultado:', {
                paymentId: result.id,
                status: result.status,
                status_detail: result.status_detail
            });
            return {
                status: result.status || 'unknown',
                status_detail: result.status_detail
            };
        }
        catch (error) {
            console.error('❌ Erro ao consultar status do pagamento:', error.response?.data || error.message);
            if (error.response?.status === 404) {
                throw new Error('Pagamento não encontrado');
            }
            throw new Error(error.message || 'Erro ao consultar status do pagamento');
        }
    }
    // Criar customer no MercadoPago - CONFORME DOCUMENTAÇÃO OFICIAL
    static async createCustomer(email, additionalData) {
        try {
            console.log('🔄 Criando customer no MercadoPago:', email);
            if (!email || !email.includes('@')) {
                throw new Error('Email válido é obrigatório');
            }
            const customerData = {
                email: email.toLowerCase().trim(),
                ...additionalData
            };
            const response = await axios_1.default.post('https://api.mercadopago.com/v1/customers', customerData, {
                headers: {
                    'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'FoodApp/1.0'
                },
                timeout: 10000
            });
            console.log('✅ Customer criado no MercadoPago:', response.data.id);
            return response.data;
        }
        catch (error) {
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
    static async searchCustomerByEmail(email) {
        try {
            console.log('🔄 Buscando customer por email:', email);
            if (!email || !email.includes('@')) {
                throw new Error('Email válido é obrigatório');
            }
            const response = await axios_1.default.get(`https://api.mercadopago.com/v1/customers/search?email=${encodeURIComponent(email.toLowerCase().trim())}`, {
                headers: {
                    'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
                    'User-Agent': 'FoodApp/1.0'
                },
                timeout: 10000
            });
            if (response.data.results && response.data.results.length > 0) {
                console.log('✅ Customer encontrado:', response.data.results[0].id);
                return response.data.results[0];
            }
            else {
                throw new Error('Customer não encontrado');
            }
        }
        catch (error) {
            console.error('❌ Erro ao buscar customer:', error.response?.data || error.message);
            throw new Error(`Erro ao buscar customer: ${error.response?.data?.message || error.message}`);
        }
    }
    // Buscar customer por ID - CONFORME DOCUMENTAÇÃO OFICIAL
    static async getCustomerById(customerId) {
        try {
            console.log('🔄 Buscando customer por ID:', customerId);
            if (!customerId) {
                throw new Error('ID do customer é obrigatório');
            }
            const response = await axios_1.default.get(`https://api.mercadopago.com/v1/customers/${customerId}`, {
                headers: {
                    'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
                    'User-Agent': 'FoodApp/1.0'
                },
                timeout: 10000
            });
            console.log('✅ Customer encontrado:', response.data.id);
            return response.data;
        }
        catch (error) {
            console.error('❌ Erro ao buscar customer por ID:', error.response?.data || error.message);
            if (error.response?.status === 404) {
                throw new Error('Customer não encontrado');
            }
            throw new Error(`Erro ao buscar customer: ${error.response?.data?.message || error.message}`);
        }
    }
    // Modificar customer - CONFORME DOCUMENTAÇÃO OFICIAL
    static async updateCustomer(customerId, updateData) {
        try {
            console.log('🔄 Modificando customer:', customerId, updateData);
            if (!customerId) {
                throw new Error('ID do customer é obrigatório');
            }
            if (!updateData || Object.keys(updateData).length === 0) {
                throw new Error('Dados para atualização são obrigatórios');
            }
            const response = await axios_1.default.put(`https://api.mercadopago.com/v1/customers/${customerId}`, updateData, {
                headers: {
                    'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'FoodApp/1.0'
                },
                timeout: 10000
            });
            console.log('✅ Customer modificado:', response.data.id);
            return response.data;
        }
        catch (error) {
            console.error('❌ Erro ao modificar customer:', error.response?.data || error.message);
            if (error.response?.status === 404) {
                throw new Error('Customer não encontrado');
            }
            throw new Error(`Erro ao modificar customer: ${error.response?.data?.message || error.message}`);
        }
    }
    // Adicionar cartão ao customer - CONFORME DOCUMENTAÇÃO OFICIAL
    static async addCardToCustomer(customerId, token) {
        try {
            console.log('🔄 Adicionando cartão ao customer:', customerId);
            if (!customerId || !token) {
                throw new Error('customerId e token são obrigatórios');
            }
            // Segundo a documentação oficial, apenas o token é necessário
            // O Mercado Pago detecta automaticamente a bandeira do cartão
            const cardData = { token };
            const response = await axios_1.default.post(`https://api.mercadopago.com/v1/customers/${customerId}/cards`, cardData, {
                headers: {
                    'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'FoodApp/1.0'
                },
                timeout: 10000
            });
            console.log('✅ Cartão adicionado ao customer:', response.data.id);
            return response.data;
        }
        catch (error) {
            console.error('❌ Erro ao adicionar cartão ao customer:', error.response?.data || error.message);
            if (error.response?.status === 404) {
                throw new Error('Customer não encontrado');
            }
            else if (error.response?.status === 400) {
                const errorData = error.response.data;
                if (errorData.message?.includes('invalid_token')) {
                    throw new Error('Token do cartão inválido');
                }
            }
            throw new Error(`Erro ao adicionar cartão: ${error.response?.data?.message || error.message}`);
        }
    }
    // Listar cartões do customer - CONFORME DOCUMENTAÇÃO OFICIAL
    static async getCustomerCards(customerId) {
        try {
            console.log('🔄 Listando cartões do customer:', customerId);
            if (!customerId) {
                throw new Error('ID do customer é obrigatório');
            }
            const response = await axios_1.default.get(`https://api.mercadopago.com/v1/customers/${customerId}/cards`, {
                headers: {
                    'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
                    'User-Agent': 'FoodApp/1.0'
                },
                timeout: 10000
            });
            console.log('✅ Cartões obtidos do customer:', response.data.length);
            return response.data || [];
        }
        catch (error) {
            console.error('❌ Erro ao obter cartões do customer:', error.response?.data || error.message);
            if (error.response?.status === 404) {
                throw new Error('Customer não encontrado');
            }
            throw new Error(`Erro ao obter cartões: ${error.response?.data?.message || error.message}`);
        }
    }
    // Remover cartão do customer - CONFORME DOCUMENTAÇÃO OFICIAL
    static async removeCardFromCustomer(customerId, cardId) {
        try {
            console.log('🔄 Removendo cartão do customer:', customerId, cardId);
            if (!customerId || !cardId) {
                throw new Error('customerId e cardId são obrigatórios');
            }
            const response = await axios_1.default.delete(`https://api.mercadopago.com/v1/customers/${customerId}/cards/${cardId}`, {
                headers: {
                    'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
                    'User-Agent': 'FoodApp/1.0'
                },
                timeout: 10000
            });
            console.log('✅ Cartão removido do customer');
            return response.data;
        }
        catch (error) {
            console.error('❌ Erro ao remover cartão do customer:', error.response?.data || error.message);
            if (error.response?.status === 404) {
                throw new Error('Customer ou cartão não encontrado');
            }
            throw new Error(`Erro ao remover cartão: ${error.response?.data?.message || error.message}`);
        }
    }
    // Criar pagamento com cartão salvo - CONFORME DOCUMENTAÇÃO OFICIAL
    static async createPaymentWithSavedCard(paymentData) {
        try {
            console.log('🔄 Criando pagamento com cartão salvo:', {
                customerId: paymentData.customerId,
                cardId: paymentData.cardId.substring(0, 6) + '****',
                amount: paymentData.amount
            });
            // Validações básicas
            if (!paymentData.amount || paymentData.amount <= 0) {
                throw new Error('Valor do pagamento inválido');
            }
            if (!paymentData.customerId || !paymentData.cardId || !paymentData.securityCode) {
                throw new Error('Dados obrigatórios ausentes');
            }
            // Verificar se o customer existe
            try {
                await this.getCustomerById(paymentData.customerId);
                console.log('✅ Customer encontrado:', paymentData.customerId);
            }
            catch (customerError) {
                console.error('❌ Customer não encontrado:', customerError.message);
                throw new Error('Customer não encontrado no MercadoPago');
            }
            // Gerar token com card_id + security_code conforme documentação oficial
            console.log('🔄 Gerando token para cartão salvo...');
            const tokenResponse = await axios_1.default.post('https://api.mercadopago.com/v1/card_tokens', {
                card_id: paymentData.cardId,
                security_code: paymentData.securityCode
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'FoodApp/1.0'
                },
                timeout: 10000
            });
            const token = tokenResponse.data.id;
            console.log('✅ Token gerado para cartão salvo:', token);
            // Gerar chave de idempotência única
            const idempotencyKey = `saved-card-payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            // Criar pagamento com token gerado + payer.type: 'customer'
            const paymentDataRequest = {
                transaction_amount: paymentData.amount,
                description: paymentData.description,
                token: token,
                installments: paymentData.installments || 1,
                payer: {
                    type: 'customer',
                    id: paymentData.customerId
                },
                additional_info: {
                    items: [{
                            id: 'food-order',
                            title: paymentData.description,
                            description: 'Pedido de comida',
                            quantity: 1,
                            unit_price: paymentData.amount,
                            category_id: 'food'
                        }]
                }
            };
            console.log('📤 Enviando pagamento com cartão salvo...');
            const response = await axios_1.default.post('https://api.mercadopago.com/v1/payments', paymentDataRequest, {
                headers: {
                    'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                    'X-Idempotency-Key': idempotencyKey,
                    'User-Agent': 'FoodApp/1.0'
                },
                timeout: 15000
            });
            console.log('✅ Pagamento criado com cartão salvo:', response.data.id);
            return {
                paymentId: response.data.id?.toString() || '',
                status: response.data.status || 'unknown',
                status_detail: response.data.status_detail || 'unknown',
            };
        }
        catch (error) {
            console.error('❌ Erro ao criar pagamento com cartão salvo:', error.response?.data || error.message);
            // Tratamento específico para erros conhecidos
            if (error.response?.status === 400) {
                const errorData = error.response.data;
                if (errorData.message?.includes('invalid_card_id')) {
                    throw new Error('Cartão não encontrado ou inválido');
                }
                else if (errorData.message?.includes('invalid_security_code')) {
                    throw new Error('Código de segurança inválido');
                }
                else if (errorData.message?.includes('customer_not_found')) {
                    throw new Error('Cliente não encontrado');
                }
            }
            throw new Error(`Erro ao processar pagamento: ${error.response?.data?.message || error.message}`);
        }
    }
    // Método auxiliar: Criar customer e cartão em uma operação - CONFORME DOCUMENTAÇÃO OFICIAL
    static async createCustomerAndCard(email, cardToken, paymentMethodId) {
        try {
            console.log('🔄 Criando customer e cartão em uma operação:', email);
            // Criar ou buscar customer
            let customer;
            try {
                customer = await this.createCustomer(email);
            }
            catch (error) {
                if (error.message.includes('already exists')) {
                    customer = await this.searchCustomerByEmail(email);
                }
                else {
                    throw error;
                }
            }
            // Adicionar cartão ao customer
            const card = await this.addCardToCustomer(customer.id, cardToken);
            console.log('✅ Customer e cartão criados com sucesso:', { customerId: customer.id, cardId: card.id });
            return { customer, card };
        }
        catch (error) {
            console.error('❌ Erro ao criar customer e cartão:', error.message);
            throw error;
        }
    }
    // Método auxiliar: Buscar ou criar customer por email
    static async findOrCreateCustomer(email) {
        try {
            console.log('🔄 Buscando ou criando customer:', email);
            try {
                // Tentar buscar customer existente
                return await this.searchCustomerByEmail(email);
            }
            catch (error) {
                // Se não encontrou, criar novo
                console.log('🔄 Customer não encontrado, criando novo...');
                return await this.createCustomer(email);
            }
        }
        catch (error) {
            console.error('❌ Erro ao buscar ou criar customer:', error.message);
            throw error;
        }
    }
    // Criar reembolso parcial/total - CONFORME DOCUMENTAÇÃO OFICIAL
    static async createRefund(paymentId, amount) {
        try {
            console.log('🔄 Criando reembolso:', { paymentId, amount: amount ? `R$ ${amount}` : 'total' });
            // Validar se o pagamento existe e está em estado válido para reembolso
            try {
                const payment = await this.getPaymentStatus(paymentId);
                console.log('✅ Status do pagamento:', payment.status);
                // Verificar se o pagamento está aprovado (necessário para reembolso)
                if (payment.status !== 'approved') {
                    throw new Error(`Pagamento não está aprovado. Status atual: ${payment.status}`);
                }
            }
            catch (error) {
                if (error.message.includes('not found')) {
                    throw new Error('Pagamento não encontrado');
                }
                throw error;
            }
            // Preparar payload do reembolso
            const refundData = {};
            if (amount && amount > 0) {
                refundData.amount = amount;
                console.log('💰 Reembolso parcial:', amount);
            }
            else {
                console.log('💰 Reembolso total');
            }
            // Gerar chave de idempotência única
            const idempotencyKey = `refund-${paymentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            console.log('📤 Enviando requisição de reembolso:', JSON.stringify(refundData, null, 2));
            const response = await axios_1.default.post(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, refundData, {
                headers: {
                    'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                    'X-Idempotency-Key': idempotencyKey,
                    'X-Render-In-Process-Refunds': 'true', // Header específico para PIX conforme documentação oficial
                },
            });
            console.log('✅ Reembolso criado com sucesso:', {
                refundId: response.data.id,
                paymentId: response.data.payment_id,
                amount: response.data.amount,
                status: response.data.status,
                refundMode: response.data.refund_mode,
                e2eId: response.data.e2e_id // ID específico para PIX
            });
            return {
                refundId: response.data.id,
                paymentId: response.data.payment_id,
                amount: response.data.amount,
                status: response.data.status,
                dateCreated: response.data.date_created,
                refundMode: response.data.refund_mode,
                e2eId: response.data.e2e_id, // ID específico para PIX conforme documentação
                amountRefundedToPayer: response.data.amount_refunded_to_payer,
                labels: response.data.labels, // Labels como "hidden", "contingency"
                reason: response.data.reason
            };
        }
        catch (error) {
            console.error('❌ Erro ao criar reembolso:', error.response?.data || error.message);
            console.error('❌ Status:', error.response?.status);
            // Tratamento específico para erros conhecidos conforme documentação
            if (error.response?.status === 400) {
                const errorData = error.response.data;
                const errorCode = errorData.error_code;
                switch (errorCode) {
                    case 2063:
                        throw new Error('Ação solicitada não é válida para o estado atual do pagamento');
                    case 2085:
                        throw new Error('Valor inválido para operação do gateway');
                    case 4040:
                        throw new Error('Valor do reembolso deve ser positivo');
                    case 4041:
                        throw new Error('Valor do reembolso deve ser numérico');
                    case 3024:
                        throw new Error('Reembolso parcial não suportado para esta transação');
                    default:
                        // Para PIX, pode haver contingências que são reportadas como 400
                        // mas com header X-Render-In-Process-Refunds: true, retorna 201 com status in_process
                        throw new Error(`Erro de validação: ${errorData.message || 'Dados inválidos'}`);
                }
            }
            else if (error.response?.status === 404) {
                const errorData = error.response.data;
                const errorCode = errorData.error_code;
                switch (errorCode) {
                    case 2000:
                        throw new Error('Pagamento não encontrado');
                    case 2024:
                    case 15016:
                        throw new Error('Pagamento muito antigo para ser reembolsado');
                    case 2032:
                        throw new Error('Reembolso não encontrado');
                    default:
                        throw new Error(`Recurso não encontrado: ${errorData.message || 'Pagamento não existe'}`);
                }
            }
            throw new Error(`Erro ao processar reembolso: ${error.response?.data?.message || error.message}`);
        }
    }
    // Método auxiliar: Reembolso total (sem especificar valor)
    static async createFullRefund(paymentId) {
        return this.createRefund(paymentId);
    }
    // Método auxiliar: Reembolso parcial (especificando valor)
    static async createPartialRefund(paymentId, amount) {
        if (amount <= 0) {
            throw new Error('Valor do reembolso deve ser maior que zero');
        }
        return this.createRefund(paymentId, amount);
    }
    // Verificar se um pagamento pode ser reembolsado
    static async canRefundPayment(paymentId) {
        try {
            const payment = await this.getPaymentStatus(paymentId);
            if (payment.status !== 'approved') {
                return {
                    canRefund: false,
                    reason: `Pagamento não está aprovado. Status atual: ${payment.status}`
                };
            }
            return { canRefund: true };
        }
        catch (error) {
            return {
                canRefund: false,
                reason: `Erro ao verificar pagamento: ${error.message}`
            };
        }
    }
    // Método específico para reembolsos PIX - CONFORME DOCUMENTAÇÃO OFICIAL
    static async createPixRefund(paymentId, amount) {
        try {
            console.log('🔄 Criando reembolso PIX:', { paymentId, amount: amount ? `R$ ${amount}` : 'total' });
            // Validar se o pagamento existe e está em estado válido para reembolso
            try {
                const payment = await this.getPaymentStatus(paymentId);
                console.log('✅ Status do pagamento PIX:', payment.status);
                // Verificar se o pagamento está aprovado (necessário para reembolso)
                if (payment.status !== 'approved') {
                    throw new Error(`Pagamento PIX não está aprovado. Status atual: ${payment.status}`);
                }
            }
            catch (error) {
                if (error.message.includes('not found')) {
                    throw new Error('Pagamento PIX não encontrado');
                }
                throw error;
            }
            // Preparar payload do reembolso PIX
            const refundData = {};
            if (amount && amount > 0) {
                refundData.amount = amount;
                console.log('💰 Reembolso PIX parcial:', amount);
            }
            else {
                console.log('💰 Reembolso PIX total');
            }
            // Gerar chave de idempotência única
            const idempotencyKey = `pix-refund-${paymentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            console.log('📤 Enviando requisição de reembolso PIX:', JSON.stringify(refundData, null, 2));
            const response = await axios_1.default.post(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, refundData, {
                headers: {
                    'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                    'X-Idempotency-Key': idempotencyKey,
                    'X-Render-In-Process-Refunds': 'true', // Header específico para PIX conforme documentação oficial
                },
            });
            console.log('✅ Reembolso PIX criado com sucesso:', {
                refundId: response.data.id,
                paymentId: response.data.payment_id,
                amount: response.data.amount,
                status: response.data.status,
                e2eId: response.data.e2e_id,
                labels: response.data.labels
            });
            return {
                refundId: response.data.id,
                paymentId: response.data.payment_id,
                amount: response.data.amount,
                status: response.data.status,
                dateCreated: response.data.date_created,
                refundMode: response.data.refund_mode,
                e2eId: response.data.e2e_id, // ID específico para PIX conforme documentação
                amountRefundedToPayer: response.data.amount_refunded_to_payer,
                labels: response.data.labels, // Labels como "hidden", "contingency"
                reason: response.data.reason,
                isPixRefund: true // Flag para identificar reembolso PIX
            };
        }
        catch (error) {
            console.error('❌ Erro ao criar reembolso PIX:', error.response?.data || error.message);
            console.error('❌ Status:', error.response?.status);
            // Tratamento específico para erros PIX conforme documentação
            if (error.response?.status === 400) {
                const errorData = error.response.data;
                const errorCode = errorData.error_code;
                switch (errorCode) {
                    case 2063:
                        throw new Error('Ação solicitada não é válida para o estado atual do pagamento PIX');
                    case 2085:
                        throw new Error('Valor inválido para operação do gateway PIX');
                    case 4040:
                        throw new Error('Valor do reembolso PIX deve ser positivo');
                    case 4041:
                        throw new Error('Valor do reembolso PIX deve ser numérico');
                    case 3024:
                        throw new Error('Reembolso parcial não suportado para esta transação PIX');
                    default:
                        // Para PIX, contingências são tratadas com header X-Render-In-Process-Refunds: true
                        throw new Error(`Erro de validação PIX: ${errorData.message || 'Dados inválidos'}`);
                }
            }
            else if (error.response?.status === 404) {
                const errorData = error.response.data;
                const errorCode = errorData.error_code;
                switch (errorCode) {
                    case 2000:
                        throw new Error('Pagamento PIX não encontrado');
                    case 2024:
                    case 15016:
                        throw new Error('Pagamento PIX muito antigo para ser reembolsado');
                    case 2032:
                        throw new Error('Reembolso PIX não encontrado');
                    default:
                        throw new Error(`Recurso PIX não encontrado: ${errorData.message || 'Pagamento PIX não existe'}`);
                }
            }
            throw new Error(`Erro ao processar reembolso PIX: ${error.response?.data?.message || error.message}`);
        }
    }
}
exports.MercadoPagoService = MercadoPagoService;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MercadoPagoService = void 0;
// Removido método duplicado fora da classe
const mercadopago_1 = require("mercadopago");
const client = new mercadopago_1.MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
});
class MercadoPagoService {
    // Função para detectar bandeira do cartão
    static detectCardBrand(cardNumber) {
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
        }
        else if (/^5[0-5]/.test(cleanNumber)) {
            // Verificar se é Elo ou Mastercard
            if (/^5067/.test(cleanNumber)) {
                console.log('✅ Backend detectado: Elo (começa com 5067)');
                return 'elo';
            }
            else {
                console.log('✅ Backend detectado: Mastercard (começa com 5[0-5])');
                return 'master';
            }
        }
        else if (/^3[47]/.test(cleanNumber)) {
            console.log('✅ Backend detectado: American Express (começa com 3[47])');
            return 'amex';
        }
        else if (/^6/.test(cleanNumber)) {
            console.log('✅ Backend detectado: Hipercard (começa com 6)');
            return 'hipercard';
        }
        else if (/^3[0689]/.test(cleanNumber)) {
            console.log('✅ Backend detectado: Diners (começa com 3[0689])');
            return 'diners';
        }
        console.log('⚠️ Backend: Bandeira não detectada, usando Visa como padrão');
        return 'visa'; // Default fallback
    }
    static async generateCardToken({ cardNumber, cardExp, cardCvv, cardName }) {
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
        }
        catch (error) {
            console.error('Erro ao gerar token do cartão:', error);
            throw new Error(error.message || 'Erro ao gerar token do cartão');
        }
    }
    static async createCardPayment({ amount, description, payerEmail, token, installments, paymentMethodId, issuerId }) {
        try {
            console.log('Criando pagamento cartão:', { amount, description, payerEmail, paymentMethodId, installments });
            const payment = new mercadopago_1.Payment(client);
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
        }
        catch (error) {
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
    static async createPixPayment({ amount, description, payerEmail }) {
        try {
            console.log('Criando pagamento PIX:', { amount, description, payerEmail });
            const payment = new mercadopago_1.Payment(client);
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
        }
        catch (error) {
            console.error('Erro detalhado MercadoPago PIX:', {
                message: error.message,
                status: error.status,
                response: error.response?.data,
                fullError: error
            });
            throw new Error(error.message || 'Erro ao criar pagamento PIX Mercado Pago');
        }
    }
    static async getPaymentStatus(paymentId) {
        try {
            const payment = new mercadopago_1.Payment(client);
            const result = await payment.get({ id: paymentId });
            return { status: result.status };
        }
        catch (error) {
            throw new Error(error.message || 'Erro ao consultar status do pagamento Mercado Pago');
        }
    }
}
exports.MercadoPagoService = MercadoPagoService;

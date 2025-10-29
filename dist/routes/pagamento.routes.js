"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mercadopago_service_1 = require("../services/mercadopago.service");
const router = (0, express_1.Router)();
// POST /pagamento/pix
router.post('/pix', async function (req, res) {
    const { amount, description, payerEmail, pedidoId, payerFirstName, payerLastName, payerCpf, payerAddress } = req.body;
    console.log('Recebido /pagamento/pix:', { amount, description, payerEmail, pedidoId, payerFirstName, payerLastName, payerCpf });
    if (!amount || !description || !payerEmail) {
        return res.status(400).json({ error: 'amount, description e payerEmail são obrigatórios' });
    }
    try {
        const pix = await mercadopago_service_1.MercadoPagoService.createPixPayment({
            amount,
            description,
            payerEmail,
            payerFirstName,
            payerLastName,
            payerCpf,
            payerAddress
        });
        // Pedido será criado após pagamento aprovado no frontend
        // Não salvar informações de pagamento aqui pois o pedido ainda não existe
        return res.status(200).json(pix);
    }
    catch (error) {
        console.error('❌ Erro no endpoint PIX:', error);
        console.error('❌ Stack trace:', error.stack);
        console.error('❌ Error details:', {
            message: error.message,
            status: error.status,
            response: error.response?.data
        });
        return res.status(500).json({
            error: error.message || 'Erro interno do servidor',
            details: error.message.includes('forbidden') ? 'Email do pagador não autorizado. Verifique as credenciais do MercadoPago.' : error.message
        });
    }
});
// POST /pagamento/cartao
router.post('/cartao', async function (req, res) {
    console.log('Recebido /pagamento/cartao:', req.body);
    const { amount, description, payerEmail, token, installments, paymentMethodId, issuerId, cardNumber, usarCartaoSalvo, cartaoId, securityCode, pedidoId, cardExp, cardName, cardCvv } = req.body;
    // Validação condicional: para cartão salvo não exigimos token; para cartão novo token é obrigatório
    if (!amount || !description || !payerEmail || !installments || !paymentMethodId) {
        return res.status(400).json({ error: 'amount, description, payerEmail, installments e paymentMethodId são obrigatórios' });
    }
    if (usarCartaoSalvo) {
        if (!cartaoId || !securityCode) {
            return res.status(400).json({ error: 'Para cartão salvo, cartaoId e securityCode são obrigatórios' });
        }
    }
    else {
        if (!token) {
            return res.status(400).json({ error: 'token é obrigatório para pagamento com cartão novo' });
        }
    }
    try {
        let payment;
        if (usarCartaoSalvo && cartaoId) {
            // Pagamento com cartão salvo - usando método oficial do MercadoPago
            console.log('💳 Processando pagamento com cartão salvo:', cartaoId);
            // Buscar dados do cartão no banco para obter customerId
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            const cartao = await prisma.cartao.findUnique({
                where: { id: parseInt(cartaoId) },
                include: { usuario: true }
            });
            if (!cartao || !cartao.usuario.mercadoPagoCustomerId) {
                throw new Error('Cartão salvo não encontrado ou usuário sem customer ID');
            }
            payment = await mercadopago_service_1.MercadoPagoService.createPaymentWithSavedCard({
                amount,
                description,
                payerEmail,
                customerId: cartao.usuario.mercadoPagoCustomerId,
                cardId: cartao.mercadoPagoCardId, // ID do cartão salvo no MercadoPago
                securityCode: securityCode, // CVV fornecido pelo usuário
                installments,
                paymentMethodId: paymentMethodId
            });
            await prisma.$disconnect();
        }
        else {
            // Pagamento com cartão novo
            console.log('💳 Processando pagamento com cartão novo');
            // Sempre detectar bandeira no backend para garantir precisão
            let finalPaymentMethodId = paymentMethodId;
            if (cardNumber) {
                const detectedBrand = mercadopago_service_1.MercadoPagoService.detectCardBrand(cardNumber);
                finalPaymentMethodId = detectedBrand;
                console.log('Bandeira detectada no backend:', detectedBrand, 'para cartão:', cardNumber.substring(0, 6) + '****');
            }
            payment = await mercadopago_service_1.MercadoPagoService.createCardPayment({
                amount,
                description,
                payerEmail,
                token,
                installments,
                paymentMethodId: finalPaymentMethodId,
                issuerId
            });
            // Se o pagamento foi aprovado, salvar o cartão automaticamente
            console.log('🔍 Verificando status do pagamento:', {
                status: payment.status,
                status_detail: payment.status_detail,
                hasCardNumber: !!cardNumber,
                cardNumberLength: cardNumber?.length
            });
            // Considerar pagamento como aprovado se status for 'approved' ou 'pending' (que pode ser aprovado posteriormente)
            if ((payment.status === 'approved' || payment.status === 'pending') && cardNumber) {
                console.log('✅ Pagamento aprovado! Salvando cartão automaticamente...');
                try {
                    // Buscar usuário pelo email
                    const { PrismaClient } = require('@prisma/client');
                    const prisma = new PrismaClient();
                    const usuario = await prisma.usuario.findFirst({
                        where: { email: payerEmail }
                    });
                    if (usuario) {
                        // Criar ou obter customer no MercadoPago
                        let customerId = usuario.mercadoPagoCustomerId;
                        if (!customerId) {
                            const customer = await mercadopago_service_1.MercadoPagoService.createCustomer(usuario.email);
                            customerId = customer.id;
                            // Atualizar usuário com customer ID
                            await prisma.usuario.update({
                                where: { id: usuario.id },
                                data: { mercadoPagoCustomerId: customerId }
                            });
                        }
                        // Adicionar cartão ao customer no MercadoPago
                        const mercadoPagoCard = await mercadopago_service_1.MercadoPagoService.addCardToCustomer(customerId, token);
                        // Extrair dados do cartão
                        const cleanCardNumber = cardNumber.replace(/\s/g, '');
                        const lastFourDigits = cleanCardNumber.slice(-4);
                        const firstSixDigits = cleanCardNumber.slice(0, 6);
                        const expParts = req.body.cardExp?.split('/') || ['01', '30'];
                        const expirationMonth = parseInt(expParts[0], 10);
                        const expirationYear = parseInt(expParts[1], 10) + 2000;
                        // Verificar se o cartão já existe
                        console.log('🔍 Verificando se cartão já existe:', {
                            mercadoPagoCardId: mercadoPagoCard.id,
                            usuarioId: usuario.id
                        });
                        const cartaoExistente = await prisma.cartao.findFirst({
                            where: {
                                mercadoPagoCardId: mercadoPagoCard.id,
                                usuarioId: usuario.id
                            }
                        });
                        if (!cartaoExistente) {
                            // Verificar se é o primeiro cartão (será o padrão)
                            const existingCartoes = await prisma.cartao.count({
                                where: { usuarioId: usuario.id }
                            });
                            const isDefault = existingCartoes === 0;
                            console.log('🔍 Dados do cartão para salvar:', {
                                usuarioId: usuario.id,
                                mercadoPagoCardId: mercadoPagoCard.id,
                                lastFourDigits,
                                firstSixDigits,
                                expirationMonth,
                                expirationYear,
                                paymentMethodId: finalPaymentMethodId,
                                isDefault,
                                existingCartoes
                            });
                            // Salvar cartão no banco
                            const cartaoSalvo = await prisma.cartao.create({
                                data: {
                                    usuarioId: usuario.id,
                                    mercadoPagoCardId: mercadoPagoCard.id,
                                    lastFourDigits,
                                    firstSixDigits,
                                    expirationMonth,
                                    expirationYear,
                                    paymentMethodId: finalPaymentMethodId,
                                    isDefault
                                }
                            });
                            console.log('✅ Cartão salvo automaticamente após pagamento aprovado:', cartaoSalvo);
                        }
                        else {
                            console.log('⚠️ Cartão já existe, não salvando novamente:', cartaoExistente);
                        }
                    }
                    await prisma.$disconnect();
                }
                catch (saveError) {
                    console.error('❌ Erro ao salvar cartão automaticamente:', saveError);
                    // Não falhar o pagamento por causa do erro de salvamento
                }
            }
        }
        // Pedido será criado após pagamento aprovado no frontend
        // Não salvar informações de pagamento aqui pois o pedido ainda não existe
        return res.status(200).json(payment);
    }
    catch (error) {
        console.error('Erro no endpoint Cartão:', error);
        return res.status(500).json({
            error: error.message,
            details: error.message.includes('forbidden') ? 'Email do pagador não autorizado. Verifique as credenciais do MercadoPago.' :
                error.message.includes('bin_not_found') ? 'Bandeira do cartão não reconhecida. Tente outro cartão.' : error.message
        });
    }
});
// POST /pagamento/gerar-token-cartao
router.post('/gerar-token-cartao', async function (req, res) {
    const { cardNumber, cardExp, cardCvv, cardName } = req.body;
    console.log('Recebido /pagamento/gerar-token-cartao:', { cardNumber: cardNumber?.substring(0, 4) + '****', cardExp, cardName });
    if (!cardNumber || !cardExp || !cardCvv || !cardName) {
        return res.status(400).json({ error: 'cardNumber, cardExp, cardCvv e cardName são obrigatórios' });
    }
    try {
        const token = await mercadopago_service_1.MercadoPagoService.generateCardToken({ cardNumber, cardExp, cardCvv, cardName });
        return res.status(200).json({ token });
    }
    catch (error) {
        console.error('Erro ao gerar token do cartão:', error);
        return res.status(500).json({
            error: error.message,
            details: 'Erro ao gerar token do cartão. Verifique os dados do cartão.'
        });
    }
});
router.post('/gerar-token-cartao-salvo', async function (req, res) {
    console.log('Recebido /pagamento/gerar-token-cartao-salvo:', req.body);
    const { cardId, securityCode } = req.body;
    if (!cardId || !securityCode) {
        return res.status(400).json({ error: 'cardId e securityCode são obrigatórios' });
    }
    try {
        const token = await mercadopago_service_1.MercadoPagoService.generateSavedCardToken({ cardId, securityCode });
        return res.status(200).json({ token });
    }
    catch (error) {
        console.error('Erro no endpoint gerar-token-cartao-salvo:', error);
        return res.status(500).json({
            error: error.message,
            details: error.message.includes('invalid') ? 'CVV inválido. Verifique o código de segurança.' : error.message
        });
    }
});
// GET /pagamento/mercadopago/status/:id
router.get('/mercadopago/status/:id', async function (req, res) {
    const { id } = req.params;
    if (!id)
        return res.status(400).json({ error: 'paymentId obrigatório' });
    try {
        const status = await mercadopago_service_1.MercadoPagoService.getPaymentStatus(id);
        return res.status(200).json(status);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// POST /pagamento/webhook/mercadopago - Webhook do Mercado Pago
router.post('/webhook/mercadopago', async (req, res) => {
    try {
        console.log('🔔 Webhook recebido:', req.body);
        const { type, data } = req.body;
        // Verificar se é uma notificação de pagamento
        if (type === 'payment' && data?.id) {
            const paymentId = data.id;
            console.log(`💰 Verificando pagamento: ${paymentId}`);
            // Buscar status atual do pagamento
            const paymentStatus = await mercadopago_service_1.MercadoPagoService.getPaymentStatus(paymentId);
            console.log(`📊 Status do pagamento ${paymentId}:`, paymentStatus);
            if (paymentStatus.status === 'approved') {
                console.log('✅ Pagamento aprovado! Processando...');
                // Aqui você pode:
                // 1. Atualizar o pedido no banco de dados
                // 2. Enviar email de confirmação
                // 3. Notificar o frontend via WebSocket
                // 4. Processar outras ações pós-pagamento
                res.status(200).json({
                    success: true,
                    message: 'Webhook processado com sucesso',
                    paymentId,
                    status: paymentStatus.status
                });
            }
            else {
                console.log(`⏳ Pagamento ainda pendente: ${paymentStatus.status}`);
                res.status(200).json({
                    success: true,
                    message: 'Webhook recebido, pagamento pendente',
                    paymentId,
                    status: paymentStatus.status
                });
            }
        }
        else {
            console.log('❓ Tipo de webhook não reconhecido:', type);
            res.status(200).json({ success: true, message: 'Webhook recebido' });
        }
    }
    catch (error) {
        console.error('❌ Erro ao processar webhook:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
// POST /pagamento/webhook/simulate/:paymentId - Simular aprovação de pagamento (para testes)
router.post('/webhook/simulate/:paymentId', async (req, res) => {
    try {
        const { paymentId } = req.params;
        console.log(`🧪 Simulando aprovação do pagamento: ${paymentId}`);
        // Simular o payload que o Mercado Pago enviaria
        const simulatedWebhook = {
            action: 'payment.updated',
            api_version: 'v1',
            data: { id: parseInt(paymentId) },
            date_created: new Date().toISOString(),
            type: 'payment'
        };
        // Processar como se fosse um webhook real
        const { type, data } = simulatedWebhook;
        if (type === 'payment' && data?.id) {
            const paymentStatus = await mercadopago_service_1.MercadoPagoService.getPaymentStatus(String(data.id));
            if (paymentStatus.status === 'approved') {
                console.log('✅ Pagamento simulado como aprovado!');
                res.status(200).json({
                    success: true,
                    message: 'Pagamento simulado como aprovado',
                    paymentId: data.id,
                    status: paymentStatus.status
                });
            }
            else {
                console.log('⚠️ Pagamento ainda não está aprovado no Mercado Pago');
                res.status(400).json({
                    success: false,
                    message: 'Pagamento ainda não está aprovado',
                    currentStatus: paymentStatus.status
                });
            }
        }
    }
    catch (error) {
        console.error('❌ Erro ao simular pagamento:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao simular pagamento'
        });
    }
});
// POST /pagamento/force-approve/:paymentId - FORÇAR APROVAÇÃO (APENAS PARA TESTES)
router.post('/force-approve/:paymentId', async (req, res) => {
    try {
        const { paymentId } = req.params;
        console.log(`🚀 FORÇANDO aprovação do pagamento: ${paymentId}`);
        // Simular webhook de aprovação
        const webhookPayload = {
            action: 'payment.updated',
            api_version: 'v1',
            data: { id: parseInt(paymentId) },
            date_created: new Date().toISOString(),
            type: 'payment'
        };
        // Processar como webhook real
        const { type, data } = webhookPayload;
        if (type === 'payment' && data?.id) {
            // Simular que o pagamento foi aprovado
            console.log('✅ Pagamento simulado como APROVADO!');
            res.status(200).json({
                success: true,
                message: 'Pagamento FORÇADO como aprovado para teste',
                paymentId: data.id,
                status: 'approved',
                simulated: true
            });
        }
    }
    catch (error) {
        console.error('❌ Erro ao forçar aprovação:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao forçar aprovação'
        });
    }
});
exports.default = router;

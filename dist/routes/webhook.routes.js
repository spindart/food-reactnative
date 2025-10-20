"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mercadopago_service_1 = require("../services/mercadopago.service");
const router = (0, express_1.Router)();
// Endpoint para receber webhooks do Mercado Pago
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
                // Exemplo de resposta para o Mercado Pago
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
// Endpoint para simular aprovação de pagamento (para testes)
router.post('/webhook/simulate-payment/:paymentId', async (req, res) => {
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
            const paymentStatus = await mercadopago_service_1.MercadoPagoService.getPaymentStatus(data.id.toString());
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
exports.default = router;

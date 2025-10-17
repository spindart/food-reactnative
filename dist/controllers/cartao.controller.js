"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartaoController = void 0;
const client_1 = require("@prisma/client");
const mercadopago_service_1 = require("../services/mercadopago.service");
const prisma = new client_1.PrismaClient();
class CartaoController {
    // Listar cartões do usuário
    static async getCartoes(req, res) {
        try {
            const { usuarioId } = req.params;
            const cartoes = await prisma.cartao.findMany({
                where: { usuarioId: parseInt(usuarioId) },
                orderBy: [
                    { isDefault: 'desc' },
                    { createdAt: 'desc' }
                ]
            });
            res.status(200).json(cartoes);
        }
        catch (error) {
            console.error('Erro ao listar cartões:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    // Adicionar novo cartão
    static async adicionarCartao(req, res) {
        try {
            console.log('=== INÍCIO ADICIONAR CARTÃO ===');
            console.log('Body recebido:', req.body);
            const { usuarioId, token, cardNumber, cardExp, cardCvv, cardName } = req.body;
            if (!usuarioId || !token || !cardNumber || !cardExp || !cardCvv || !cardName) {
                res.status(400).json({ error: 'Dados obrigatórios ausentes' });
                return;
            }
            // Buscar usuário
            const usuario = await prisma.usuario.findUnique({
                where: { id: parseInt(usuarioId) }
            });
            if (!usuario) {
                res.status(404).json({ error: 'Usuário não encontrado' });
                return;
            }
            // Detectar bandeira do cartão
            const paymentMethodId = mercadopago_service_1.MercadoPagoService.detectCardBrand(cardNumber);
            // Criar ou obter customer no MercadoPago
            let customerId = usuario.mercadoPagoCustomerId;
            if (!customerId) {
                const customer = await mercadopago_service_1.MercadoPagoService.createCustomer(usuario.email);
                customerId = customer.id;
                // Atualizar usuário com customer ID
                await prisma.usuario.update({
                    where: { id: parseInt(usuarioId) },
                    data: { mercadoPagoCustomerId: customerId }
                });
            }
            // Adicionar cartão ao customer no MercadoPago
            const mercadoPagoCard = await mercadopago_service_1.MercadoPagoService.addCardToCustomer(customerId, token, paymentMethodId);
            // Extrair dados do cartão
            const cleanCardNumber = cardNumber.replace(/\s/g, '');
            const lastFourDigits = cleanCardNumber.slice(-4);
            const firstSixDigits = cleanCardNumber.slice(0, 6);
            const expParts = cardExp.split('/');
            const expirationMonth = parseInt(expParts[0], 10);
            const expirationYear = parseInt(expParts[1], 10) + 2000; // Converter para ano completo
            // Verificar se é o primeiro cartão (será o padrão)
            const existingCartoes = await prisma.cartao.count({
                where: { usuarioId: parseInt(usuarioId) }
            });
            const isDefault = existingCartoes === 0;
            // Salvar cartão no banco
            const cartao = await prisma.cartao.create({
                data: {
                    usuarioId: parseInt(usuarioId),
                    mercadoPagoCardId: mercadoPagoCard.id,
                    lastFourDigits,
                    firstSixDigits,
                    expirationMonth,
                    expirationYear,
                    paymentMethodId,
                    isDefault
                }
            });
            res.status(201).json({
                success: true,
                cartao,
                message: 'Cartão adicionado com sucesso'
            });
        }
        catch (error) {
            console.error('❌ ERRO AO ADICIONAR CARTÃO:', error);
            console.error('❌ Stack trace:', error.stack);
            console.error('❌ Error message:', error.message);
            res.status(500).json({
                error: 'Erro ao adicionar cartão',
                details: error.message
            });
        }
    }
    // Definir cartão como padrão
    static async definirCartaoPadrao(req, res) {
        try {
            const { cartaoId, usuarioId } = req.body;
            if (!cartaoId || !usuarioId) {
                res.status(400).json({ error: 'ID do cartão e usuário são obrigatórios' });
                return;
            }
            // Remover padrão de todos os cartões do usuário
            await prisma.cartao.updateMany({
                where: { usuarioId: parseInt(usuarioId) },
                data: { isDefault: false }
            });
            // Definir novo cartão como padrão
            const cartao = await prisma.cartao.update({
                where: { id: parseInt(cartaoId) },
                data: { isDefault: true }
            });
            res.status(200).json({
                success: true,
                cartao,
                message: 'Cartão definido como padrão'
            });
        }
        catch (error) {
            console.error('Erro ao definir cartão padrão:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    // Remover cartão
    static async removerCartao(req, res) {
        try {
            const { cartaoId } = req.params;
            const cartao = await prisma.cartao.findUnique({
                where: { id: parseInt(cartaoId) }
            });
            if (!cartao) {
                res.status(404).json({ error: 'Cartão não encontrado' });
                return;
            }
            // Remover cartão do banco
            await prisma.cartao.delete({
                where: { id: parseInt(cartaoId) }
            });
            // Se era o cartão padrão, definir outro como padrão
            if (cartao.isDefault) {
                const proximoCartao = await prisma.cartao.findFirst({
                    where: { usuarioId: cartao.usuarioId }
                });
                if (proximoCartao) {
                    await prisma.cartao.update({
                        where: { id: proximoCartao.id },
                        data: { isDefault: true }
                    });
                }
            }
            res.status(200).json({
                success: true,
                message: 'Cartão removido com sucesso'
            });
        }
        catch (error) {
            console.error('Erro ao remover cartão:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    // Obter cartão padrão do usuário
    static async getCartaoPadrao(req, res) {
        try {
            const { usuarioId } = req.params;
            const cartao = await prisma.cartao.findFirst({
                where: {
                    usuarioId: parseInt(usuarioId),
                    isDefault: true
                }
            });
            res.status(200).json(cartao);
        }
        catch (error) {
            console.error('Erro ao obter cartão padrão:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
}
exports.CartaoController = CartaoController;

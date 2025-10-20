import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MercadoPagoService } from '../services/mercadopago.service';

const prisma = new PrismaClient();

export class CartaoController {
  // Listar cartões do usuário
  static async getCartoes(req: Request, res: Response): Promise<void> {
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
    } catch (error: any) {
      console.error('Erro ao listar cartões:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Adicionar novo cartão
  static async adicionarCartao(req: Request, res: Response): Promise<void> {
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

      // Criar ou obter customer no MercadoPago
      let customerId = usuario.mercadoPagoCustomerId;
      if (!customerId) {
        const customer = await MercadoPagoService.createCustomer(usuario.email);
        customerId = customer.id;
        
        // Atualizar usuário com customer ID
        await prisma.usuario.update({
          where: { id: parseInt(usuarioId) },
          data: { mercadoPagoCustomerId: customerId }
        });
      }

      // Adicionar cartão ao customer no MercadoPago
      // O Mercado Pago detecta automaticamente a bandeira do cartão
      const mercadoPagoCard = await MercadoPagoService.addCardToCustomer(
        customerId!,
        token
      );

      // Extrair dados do cartão
      const cleanCardNumber = cardNumber.replace(/\s/g, '');
      const lastFourDigits = cleanCardNumber.slice(-4);
      const firstSixDigits = cleanCardNumber.slice(0, 6);
      
      const expParts = cardExp.split('/');
      const expirationMonth = parseInt(expParts[0], 10);
      const expirationYear = parseInt(expParts[1], 10) + 2000; // Converter para ano completo

      // Verificar se o cartão já existe (por mercadoPagoCardId)
      const cartaoExistente = await prisma.cartao.findFirst({
        where: { 
          mercadoPagoCardId: mercadoPagoCard.id,
          usuarioId: parseInt(usuarioId)
        }
      });

      if (cartaoExistente) {
        console.log('⚠️ CartaoController - Cartão já existe:', cartaoExistente);
        res.status(400).json({ 
          error: 'Este cartão já está cadastrado',
          cartao: cartaoExistente
        });
        return;
      }

      // Verificar se é o primeiro cartão (será o padrão)
      const existingCartoes = await prisma.cartao.count({
        where: { usuarioId: parseInt(usuarioId) }
      });
      const isDefault = existingCartoes === 0;

      // Usar a bandeira detectada pelo Mercado Pago
      const paymentMethodId = mercadoPagoCard.payment_method_id || 'visa';

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
    } catch (error: any) {
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
  static async definirCartaoPadrao(req: Request, res: Response): Promise<void> {
    try {
      const { cartaoId, usuarioId } = req.body;

      if (!cartaoId || !usuarioId) {
        res.status(400).json({ error: 'ID do cartão e usuário são obrigatórios' });
        return;
      }

      
      // Verificar se o cartão existe e pertence ao usuário
      const cartaoExistente = await prisma.cartao.findFirst({
        where: { 
          id: parseInt(cartaoId),
          usuarioId: parseInt(usuarioId)
        }
      });

      if (!cartaoExistente) {
        res.status(404).json({ error: 'Cartão não encontrado ou não pertence ao usuário' });
        return;
      }

      
      // Remover padrão de todos os cartões do usuário
      const updateManyResult = await prisma.cartao.updateMany({
        where: { usuarioId: parseInt(usuarioId) },
        data: { isDefault: false }
      });
      
      // console.log('✅ CartaoController - Resultado updateMany:', updateManyResult);
      // console.log('✅ CartaoController - Cartões atualizados:', updateManyResult.count);

      // console.log('🔄 CartaoController - Definindo novo cartão como padrão:', cartaoId);
      
      // Definir novo cartão como padrão
      const cartao = await prisma.cartao.update({
        where: { id: parseInt(cartaoId) },
        data: { isDefault: true }
      });

      // console.log('✅ CartaoController - Cartão definido como padrão com sucesso:', cartao);
      
      // Verificar se realmente foi salvo no banco
      const cartaoVerificacao = await prisma.cartao.findUnique({
        where: { id: parseInt(cartaoId) }
      });
      
      // console.log('🔍 CartaoController - Verificação no banco:', cartaoVerificacao);
      
      // Verificar todos os cartões do usuário após a atualização
      const todosCartoes = await prisma.cartao.findMany({
        where: { usuarioId: parseInt(usuarioId) }
      });
      
      // console.log('🔍 CartaoController - Todos os cartões após atualização:', todosCartoes);

      res.status(200).json({
        success: true,
        cartao,
        message: 'Cartão definido como padrão'
      });
    } catch (error: any) {
      console.error('Erro ao definir cartão padrão:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Remover cartão
  static async removerCartao(req: Request, res: Response): Promise<void> {
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
    } catch (error: any) {
      console.error('Erro ao remover cartão:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Obter cartão padrão do usuário
  static async getCartaoPadrao(req: Request, res: Response): Promise<void> {
    try {
      const { usuarioId } = req.params;

      const cartao = await prisma.cartao.findFirst({
        where: { 
          usuarioId: parseInt(usuarioId),
          isDefault: true
        }
      });

      res.status(200).json(cartao);
    } catch (error: any) {
      console.error('Erro ao obter cartão padrão:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

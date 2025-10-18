import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { NotificationService } from '../services/notification.service';
import { MercadoPagoService } from '../services/mercadopago.service';

const prisma = new PrismaClient();

const pedidoSchema = z.object({
  clienteId: z.number().int().positive(),
  estabelecimentoId: z.number().int().positive(),
  produtos: z.array(
    z.object({
      produtoId: z.number().int().positive(),
      quantidade: z.number().int().positive(),
    })
  ).min(1, 'A lista de produtos não pode ser vazia'),
});

export class PedidoController {
  // Confirmação de pedido: POST /orders/confirm
  static async confirmOrder(req: Request, res: Response): Promise<void> {
    console.log('Recebido pedido de confirmação:', req.body);
    
    // Espera JSON:
    // {
    //   clienteId: number,
    //   estabelecimentoId: number,
    //   produtos: [{ produtoId: number, quantidade: number }],
    //   formaPagamento: string,
    //   total: number
    // }
    const { 
      clienteId, 
      estabelecimentoId, 
      produtos, 
      formaPagamento, 
      total: totalCliente, 
      paymentId, 
      paymentStatus, 
      paymentMethod,
      formaPagamentoEntrega,
      precisaTroco,
      trocoParaQuanto,
      enderecoEntrega
    } = req.body;
    
    console.log('Dados extraídos:', { 
      clienteId, 
      estabelecimentoId, 
      produtos, 
      formaPagamento, 
      totalCliente, 
      paymentId, 
      paymentStatus, 
      paymentMethod,
      formaPagamentoEntrega,
      precisaTroco,
      trocoParaQuanto,
      enderecoEntrega
    });
    
    if (!clienteId || !estabelecimentoId || !produtos || !Array.isArray(produtos) || produtos.length === 0 || !formaPagamento || typeof totalCliente !== 'number') {
      console.log('Erro: Dados obrigatórios ausentes');
      res.status(400).json({ error: 'Dados obrigatórios ausentes.' });
      return;
    }
    try {
      // Busca produtos e taxa de entrega
      const [produtosDb, estabelecimento] = await Promise.all([
        prisma.produto.findMany({ where: { id: { in: produtos.map(p => p.produtoId) }, estabelecimentoId } }),
        prisma.estabelecimento.findUnique({ where: { id: estabelecimentoId } })
      ]);
      if (!estabelecimento) {
        res.status(400).json({ error: 'Estabelecimento não encontrado.' });
        return;
      }
      if (produtosDb.length !== produtos.length) {
        res.status(400).json({ error: 'Um ou mais produtos não encontrados para este estabelecimento.' });
        return;
      }
      let subtotal = 0;
      const itensPedido = produtos.map((p) => {
        const produtoDb = produtosDb.find((db: { id: number; preco: number }) => db.id === p.produtoId)!;
        const itemSubtotal = produtoDb.preco * p.quantidade;
        subtotal += itemSubtotal;
        return {
          produtoId: p.produtoId,
          quantidade: p.quantidade,
          precoUnitario: produtoDb.preco,
        };
      });
      const taxaEntrega = estabelecimento.taxaEntrega || 0;
      const totalCalculado = subtotal + taxaEntrega;
      
      console.log('🔍 Debug - Validação de total:');
      console.log('  totalCliente:', totalCliente);
      console.log('  totalCalculado:', totalCalculado);
      console.log('  diferença:', Math.abs(totalCalculado - totalCliente));
      
      if (Math.abs(totalCalculado - totalCliente) > 0.01) {
        res.status(400).json({ error: 'Total enviado não confere com o calculado.' });
        return;
      }
      console.log('🔍 Debug - Criando pedido no banco:');
      console.log('  clienteId:', clienteId);
      console.log('  estabelecimentoId:', estabelecimentoId);
      console.log('  totalAmount:', totalCalculado);
      console.log('  paymentId:', paymentId);
      console.log('  paymentStatus:', paymentStatus);
      console.log('  paymentMethod:', paymentMethod);
      console.log('  itensPedido:', itensPedido);
      
      const pedido = await prisma.pedido.create({
        data: {
          clienteId,
          estabelecimentoId,
          status: 'pendente',
          totalAmount: totalCalculado,
          // Informações de pagamento (se fornecidas)
          paymentId: paymentId ? paymentId.toString() : null,
          paymentStatus: paymentStatus || null,
          paymentMethod: paymentMethod || null,
          // Campos de pagamento na entrega
          formaPagamentoEntrega: formaPagamentoEntrega || null,
          precisaTroco: precisaTroco || null,
          trocoParaQuanto: trocoParaQuanto || null,
          // Campo de endereço de entrega
          enderecoEntrega: enderecoEntrega || null,
          itens: { create: itensPedido },
        },
        include: { 
          itens: { 
            include: { produto: true } 
          },
          estabelecimento: {
            select: { nome: true, imagem: true }
          }
        },
      });
      
      // Calcular total com base nos itens criados
      const totalFinal = pedido.itens.reduce((sum, item) => sum + (item.precoUnitario * item.quantidade), 0) + taxaEntrega;
      
      res.status(201).json({ 
        success: true, 
        orderId: pedido.id, 
        total: totalFinal, 
        status: 'pendente',
        pedido: {
          id: pedido.id,
          clienteId: pedido.clienteId,
          estabelecimentoId: pedido.estabelecimentoId,
          status: pedido.status,
          createdAt: pedido.createdAt,
          total: totalFinal,
          itens: pedido.itens,
          estabelecimento: pedido.estabelecimento
        }
      });
    } catch (error: any) {
      console.error('❌ Erro detalhado ao criar pedido:', error);
      console.error('❌ Erro message:', error.message);
      console.error('❌ Erro stack:', error.stack);
      console.error('❌ Erro code:', error.code);
      console.error('❌ Erro meta:', error.meta);
      res.status(400).json({ error: 'Erro ao confirmar pedido', details: error });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { 
        clienteId, 
        estabelecimentoId, 
        produtos, 
        formaPagamento,
        total,
        paymentId,
        paymentStatus,
        paymentMethod,
        formaPagamentoEntrega,
        precisaTroco,
        trocoParaQuanto,
        enderecoEntrega
      } = req.body;
      
      // Debug logs
      console.log('🔍 DEBUG - Dados recebidos no create:');
      console.log('  formaPagamentoEntrega:', formaPagamentoEntrega);
      console.log('  precisaTroco:', precisaTroco);
      console.log('  trocoParaQuanto:', trocoParaQuanto);
      console.log('  enderecoEntrega:', enderecoEntrega);
      console.log('  formaPagamento:', formaPagamento);
      
      if (!clienteId || !estabelecimentoId || !produtos || !Array.isArray(produtos) || produtos.length === 0) {
        res.status(400).json({ error: 'Dados obrigatórios ausentes.' });
        return;
      }
      
      let subtotal = 0;
      const produtosDb = await prisma.produto.findMany({ where: { id: { in: produtos.map((p: any) => p.produtoId) }, estabelecimentoId } });
      const itensPedido = produtos.map((p: any) => {
        const produtoDb = produtosDb.find((db: any) => db.id === p.produtoId);
        if (!produtoDb) throw new Error('Produto não encontrado');
        subtotal += produtoDb.preco * p.quantidade;
        return {
          produtoId: p.produtoId,
          quantidade: p.quantidade,
          precoUnitario: produtoDb.preco,
        };
      });
      
      // Debug logs antes de salvar
      console.log('🔍 DEBUG - Dados que serão salvos no banco:');
      console.log('  formaPagamentoEntrega:', formaPagamentoEntrega || null);
      console.log('  precisaTroco:', precisaTroco || null);
      console.log('  trocoParaQuanto:', trocoParaQuanto || null);
      console.log('  enderecoEntrega:', enderecoEntrega || null);
      
      const pedido = await prisma.pedido.create({
        data: {
          clienteId,
          estabelecimentoId,
          status: 'pendente',
          itens: { create: itensPedido },
          // Campos de pagamento
          paymentId: paymentId ? paymentId.toString() : null,
          paymentStatus: paymentStatus || null,
          paymentMethod: paymentMethod || null,
          totalAmount: total || null,
          // Campos de pagamento na entrega
          formaPagamentoEntrega: formaPagamentoEntrega || null,
          precisaTroco: precisaTroco || null,
          trocoParaQuanto: trocoParaQuanto || null,
          // Campo de endereço de entrega
          enderecoEntrega: enderecoEntrega || null,
        },
        include: { itens: true },
      });
      
      res.status(201).json(pedido);
    } catch (error: any) {
      console.error('Erro ao criar pedido:', error);
      res.status(400).json({ error: 'Erro ao criar pedido', details: error.message });
    }
  }

  static async listByCliente(req: Request, res: Response): Promise<void> {
    try {
      const { clienteId } = req.params;
      const pedidos = await prisma.pedido.findMany({
        where: { clienteId: Number(clienteId) },
        include: {
          itens: { include: { produto: true } },
          estabelecimento: { select: { nome: true } },
        },
      });
      console.log('Pedidos retornados pelo Prisma:', JSON.stringify(pedidos, null, 2));
      res.json(pedidos);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar pedidos do cliente', details: error });
    }
  }

  static async listByEstabelecimento(req: Request, res: Response): Promise<void> {
    try {
      const { estabelecimentoId } = req.params;
      const pedidos = await prisma.pedido.findMany({
        where: { estabelecimentoId: Number(estabelecimentoId) },
        // Incluir todos os campos do pedido (incluindo enderecoEntrega, paymentId, etc.)
        select: {
          id: true,
          clienteId: true,
          estabelecimentoId: true,
          status: true,
          createdAt: true,
          // Campos de pagamento
          paymentId: true,
          paymentStatus: true,
          paymentMethod: true,
          totalAmount: true,
          refundId: true,
          refundStatus: true,
          refundAmount: true,
          refundDate: true,
          // Campos de pagamento na entrega
          formaPagamentoEntrega: true,
          precisaTroco: true,
          trocoParaQuanto: true,
          // Campo de endereço de entrega
          enderecoEntrega: true,
          // Relacionamentos
          itens: { 
            select: {
              id: true,
              produtoId: true,
              quantidade: true,
              precoUnitario: true,
              produto: {
                select: {
                  id: true,
                  nome: true,
                  preco: true,
                }
              }
            }
          },
          estabelecimento: { 
            select: { 
              nome: true,
              imagem: true,
            } 
          },
        },
      });
      res.json(pedidos);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar pedidos do estabelecimento', details: error });
    }
  }

  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const pedido = await prisma.pedido.findUnique({ where: { id: Number(id) } });
      if (!pedido) {
        res.status(404).json({ error: 'Pedido não encontrado' });
        return;
      }
      let novoStatus: 'pendente' | 'preparo' | 'entregue' | 'cancelado';
      switch (pedido.status) {
        case 'pendente':
          novoStatus = 'preparo';
          break;
        case 'preparo':
          novoStatus = 'entregue';
          break;
        case 'entregue':
        case 'cancelado':
          res.status(400).json({ error: 'Não é possível avançar o status deste pedido' });
          return;
        default:
          res.status(400).json({ error: 'Status inválido' });
          return;
      }
      const pedidoAtualizado = await prisma.pedido.update({
        where: { id: Number(id) },
        data: { status: novoStatus },
      });
      NotificationService.notifyPedidoStatusChange(pedido.id, pedido.status, novoStatus);
      res.json(pedidoAtualizado);
    } catch (error) {
      res.status(400).json({ error: 'Erro ao atualizar status do pedido', details: error });
    }
  }

  // Cancelar pedido com reembolso automático - NOVO MÉTODO
  static async cancelOrderWithRefund(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body; // Motivo do cancelamento (opcional)
      
      console.log('🔄 Cancelando pedido com reembolso:', { pedidoId: id, reason });
      console.log('📋 Headers da requisição:', req.headers);
      console.log('📋 Body da requisição:', req.body);
      console.log('📋 User-Agent:', req.headers['user-agent']);
      console.log('📋 Origin:', req.headers.origin);

      // Buscar pedido com informações de pagamento
      const pedido = await prisma.pedido.findUnique({ 
        where: { id: Number(id) },
        include: {
          cliente: true,
          estabelecimento: true,
          itens: { include: { produto: true } }
        }
      });

      if (!pedido) {
        res.status(404).json({ error: 'Pedido não encontrado' });
        return;
      }

      // Verificar se o pedido pode ser cancelado
      if (pedido.status === 'cancelado') {
        res.status(400).json({ error: 'Pedido já foi cancelado' });
        return;
      }

      if (pedido.status === 'entregue') {
        res.status(400).json({ error: 'Não é possível cancelar um pedido já entregue' });
        return;
      }

      // Verificar se há pagamento para reembolsar
      if (!pedido.paymentId || pedido.paymentStatus !== 'approved') {
        console.log('⚠️ Pedido sem pagamento aprovado, cancelando sem reembolso');
        
        // Cancelar sem reembolso
        const pedidoCancelado = await prisma.pedido.update({
          where: { id: Number(id) },
          data: { status: 'cancelado' },
        });

        // Notificar cliente sobre cancelamento
        NotificationService.notifyPedidoStatusChange(pedido.id, pedido.status, 'cancelado');
        
        console.log('📤 Enviando resposta de cancelamento sem reembolso');
        
        res.status(200).json({
          success: true,
          message: 'Pedido cancelado com sucesso',
          pedido: pedidoCancelado,
          refund: null
        });
        return;
      }

      console.log('💰 Processando reembolso para pagamento:', pedido.paymentId);

      try {
        // Verificar se o pagamento pode ser reembolsado
        const canRefund = await MercadoPagoService.canRefundPayment(pedido.paymentId);
        
        if (!canRefund.canRefund) {
          console.log('❌ Pagamento não pode ser reembolsado:', canRefund.reason);
          
          // Cancelar sem reembolso
          const pedidoCancelado = await prisma.pedido.update({
            where: { id: Number(id) },
            data: { status: 'cancelado' },
          });

          NotificationService.notifyPedidoStatusChange(pedido.id, pedido.status, 'cancelado');
          
          res.json({
            success: true,
            message: `Pedido cancelado. Reembolso não disponível: ${canRefund.reason}`,
            pedido: pedidoCancelado,
            refund: null
          });
          return;
        }

        // Processar reembolso total - usar método específico para PIX se necessário
        let refund;
        if (pedido.paymentMethod === 'pix') {
          console.log('🔄 Processando reembolso PIX com header específico...');
          refund = await MercadoPagoService.createPixRefund(pedido.paymentId);
        } else {
          console.log('🔄 Processando reembolso cartão...');
          refund = await MercadoPagoService.createFullRefund(pedido.paymentId);
        }
        
        console.log('✅ Reembolso processado:', refund);

        // Atualizar pedido com informações do reembolso
        const pedidoAtualizado = await prisma.pedido.update({
          where: { id: Number(id) },
          data: {
            status: 'cancelado',
            refundId: refund.refundId.toString(),
            refundStatus: refund.status,
            refundAmount: refund.amount,
            refundDate: new Date()
          },
        });

        // Notificar cliente sobre cancelamento e reembolso
        NotificationService.notifyPedidoStatusChange(pedido.id, pedido.status, 'cancelado');
        
        // TODO: Enviar notificação específica sobre reembolso
        console.log('📧 Notificação de reembolso enviada para cliente');

        console.log('📤 Enviando resposta de sucesso:', {
          success: true,
          pedidoId: pedidoAtualizado.id,
          refundId: refund.refundId
        });

        res.json({
          success: true,
          message: 'Pedido cancelado e reembolso processado com sucesso',
          pedido: pedidoAtualizado,
          refund: {
            refundId: refund.refundId.toString(),
            amount: refund.amount,
            status: refund.status,
            dateCreated: refund.dateCreated,
            // Campos específicos para PIX conforme documentação
            e2eId: refund.e2eId,
            amountRefundedToPayer: refund.amountRefundedToPayer,
            labels: refund.labels,
            reason: refund.reason,
            isPixRefund: refund.isPixRefund
          }
        });

      } catch (refundError: any) {
        console.error('❌ Erro ao processar reembolso:', refundError.message);
        
        // Cancelar pedido mesmo com erro no reembolso
        const pedidoCancelado = await prisma.pedido.update({
          where: { id: Number(id) },
          data: { status: 'cancelado' },
        });

        NotificationService.notifyPedidoStatusChange(pedido.id, pedido.status, 'cancelado');
        
        res.status(500).json({
          success: true,
          message: 'Pedido cancelado, mas houve erro no reembolso. Entre em contato com o suporte.',
          pedido: pedidoCancelado,
          refund: null,
          refundError: refundError.message
        });
      }

    } catch (error: any) {
      console.error('❌ Erro ao cancelar pedido:', error);
      console.error('❌ Stack trace:', error.stack);
      
      // Verificar se é um erro de validação conhecido
      if (error.message?.includes('já foi cancelado') || error.message?.includes('já entregue')) {
        res.status(400).json({ 
          error: error.message,
          success: false
        });
        return;
      }
      
      res.status(500).json({ 
        error: 'Erro interno do servidor ao cancelar pedido',
        details: error.message,
        success: false
      });
    }
  }

  // Método auxiliar: Atualizar informações de pagamento do pedido
  static async updatePaymentInfo(pedidoId: number, paymentData: {
    paymentId: string;
    paymentStatus: string;
    paymentMethod?: string;
    totalAmount?: number;
  }): Promise<void> {
    try {
      await prisma.pedido.update({
        where: { id: pedidoId },
        data: {
          paymentId: paymentData.paymentId,
          paymentStatus: paymentData.paymentStatus,
          paymentMethod: paymentData.paymentMethod,
          totalAmount: paymentData.totalAmount
        }
      });
      console.log('✅ Informações de pagamento atualizadas para pedido:', pedidoId);
    } catch (error: any) {
      console.error('❌ Erro ao atualizar informações de pagamento:', error);
      throw error;
    }
  }
}


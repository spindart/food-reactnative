import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { NotificationService } from '../services/notification.service';

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
    // Espera JSON:
    // {
    //   clienteId: number,
    //   estabelecimentoId: number,
    //   produtos: [{ produtoId: number, quantidade: number }],
    //   formaPagamento: string,
    //   total: number
    // }
    const { clienteId, estabelecimentoId, produtos, formaPagamento, total: totalCliente } = req.body;
    if (!clienteId || !estabelecimentoId || !produtos || !Array.isArray(produtos) || produtos.length === 0 || !formaPagamento || typeof totalCliente !== 'number') {
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
      if (Math.abs(totalCalculado - totalCliente) > 0.01) {
        res.status(400).json({ error: 'Total enviado não confere com o calculado.' });
        return;
      }
      const pedido = await prisma.pedido.create({
        data: {
          clienteId,
          estabelecimentoId,
          status: 'pendente',
          itens: { create: itensPedido },
        },
        include: { itens: true },
      });
      res.status(201).json({ success: true, orderId: pedido.id, total: totalCalculado, status: 'pendente' });
    } catch (error) {
      res.status(400).json({ error: 'Erro ao confirmar pedido', details: error });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { clienteId, estabelecimentoId, produtos } = req.body;
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
      const pedido = await prisma.pedido.create({
        data: {
          clienteId,
          estabelecimentoId,
          status: 'pendente',
          itens: { create: itensPedido },
        },
        include: { itens: true },
      });
      res.status(201).json(pedido);
    } catch (error) {
      res.status(400).json({ error: 'Erro ao criar pedido', details: error });
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
        include: {
          itens: { include: { produto: true } },
          estabelecimento: { select: { nome: true } },
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
}


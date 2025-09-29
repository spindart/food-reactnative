import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AvaliacaoController {
  static async avaliarPedido(req: Request, res: Response): Promise<void> {
    try {
      const { pedidoId, nota, comentario } = req.body;
      if (!pedidoId || typeof nota !== 'number' || nota < 0 || nota > 5) {
        res.status(400).json({ error: 'Dados inválidos.' });
        return;
      }
      // Busca o pedido e o estabelecimento
      const pedido = await prisma.pedido.findUnique({
        where: { id: Number(pedidoId) },
        include: { estabelecimento: true, cliente: true },
      });
      if (!pedido) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      // Verifica se já existe avaliação desse usuário para esse estabelecimento e pedido
      const avaliacaoExistente = await prisma.avaliacao.findFirst({
        where: {
          estabelecimentoId: pedido.estabelecimentoId,
          usuarioId: pedido.clienteId,
          // Opcional: se quiser garantir 1 avaliação por pedido, adicione um campo pedidoId na tabela Avaliacao
        },
      });
      if (avaliacaoExistente) {
        res.status(400).json({ error: 'Você já avaliou este pedido/estabelecimento.' });
        return;
      }
      // Cria avaliação
      await prisma.avaliacao.create({
        data: {
          estabelecimentoId: pedido.estabelecimentoId,
          usuarioId: pedido.clienteId,
          nota,
          comentario,
        },
      });
      // Atualiza média do estabelecimento
      const stats = await prisma.avaliacao.aggregate({
        where: { estabelecimentoId: pedido.estabelecimentoId },
        _avg: { nota: true },
        _count: { nota: true },
      });
      await prisma.estabelecimento.update({
        where: { id: pedido.estabelecimentoId },
        data: {
          avaliacao: stats._avg.nota || 0,
          avaliacoesCount: stats._count.nota,
        },
      });
      res.status(201).json({ success: true });
    } catch (error) {
      res.status(400).json({ error: 'Erro ao avaliar pedido', details: error });
    }
  }
}

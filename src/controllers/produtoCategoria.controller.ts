import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ProdutoCategoriaController {
  static async listByEstabelecimento(req: Request, res: Response): Promise<void> {
    try {
      const { estabelecimentoId } = req.params;
      const categorias = await prisma.produtoCategoria.findMany({
        where: { estabelecimentoId: Number(estabelecimentoId), ativa: true },
        orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
      });
      res.json(categorias);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar categorias de produto', details: error });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { estabelecimentoId } = req.params;
      const { nome, slug, ordem, ativa } = req.body as any;

      const estabelecimento = await prisma.estabelecimento.findUnique({ where: { id: Number(estabelecimentoId) } });
      // @ts-ignore
      if (!estabelecimento || !user || user.role !== 'dono' || estabelecimento.donoId !== user.id) {
        res.status(403).json({ error: 'Apenas o dono do estabelecimento pode gerenciar categorias.' });
        return;
      }

      const categoria = await prisma.produtoCategoria.create({
        data: { estabelecimentoId: Number(estabelecimentoId), nome, slug: slug ?? null, ordem: ordem ?? 0, ativa: typeof ativa === 'boolean' ? ativa : true },
      });
      res.status(201).json(categoria);
    } catch (error) {
      res.status(400).json({ error: 'Erro ao criar categoria de produto', details: error });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { estabelecimentoId, id } = req.params as any;
      const { nome, slug, ordem, ativa } = req.body as any;

      const categoria = await prisma.produtoCategoria.findUnique({ where: { id: Number(id) } });
      const estabelecimento = await prisma.estabelecimento.findUnique({ where: { id: Number(estabelecimentoId) } });
      // @ts-ignore
      if (!categoria || categoria.estabelecimentoId !== Number(estabelecimentoId) || !estabelecimento || !user || user.role !== 'dono' || estabelecimento.donoId !== user.id) {
        res.status(403).json({ error: 'Operação não permitida.' });
        return;
      }

      const updated = await prisma.produtoCategoria.update({
        where: { id: Number(id) },
        data: {
          nome: typeof nome === 'string' ? nome : undefined,
          slug: typeof slug === 'string' ? slug : undefined,
          ordem: typeof ordem === 'number' ? ordem : undefined,
          ativa: typeof ativa === 'boolean' ? ativa : undefined,
        },
      });
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: 'Erro ao atualizar categoria de produto', details: error });
    }
  }

  static async remove(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { estabelecimentoId, id } = req.params as any;

      const categoria = await prisma.produtoCategoria.findUnique({ where: { id: Number(id) } });
      const estabelecimento = await prisma.estabelecimento.findUnique({ where: { id: Number(estabelecimentoId) } });
      // @ts-ignore
      if (!categoria || categoria.estabelecimentoId !== Number(estabelecimentoId) || !estabelecimento || !user || user.role !== 'dono' || estabelecimento.donoId !== user.id) {
        res.status(403).json({ error: 'Operação não permitida.' });
        return;
      }

      // Opcional: verificar se existem produtos usando essa categoria
      const count = await prisma.produto.count({ where: { produtoCategoriaId: Number(id) } });
      if (count > 0) {
        res.status(400).json({ error: 'Não é possível excluir: existem produtos vinculados a esta categoria.' });
        return;
      }

      await prisma.produtoCategoria.delete({ where: { id: Number(id) } });
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Erro ao remover categoria de produto', details: error });
    }
  }
}

export {};



import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const produtoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  preco: z.number().positive('Preço deve ser positivo'),
  estabelecimentoId: z.number().int().positive('EstabelecimentoId deve ser um inteiro positivo'),
  imagem: z.string().optional().nullable(), // imagem opcional
});

export class ProdutoController {
  static async create(req: Request, res: Response): Promise<void> {
    const parse = produtoSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: 'Dados inválidos', details: parse.error.errors });
      return;
    }
    try {
      const { nome, descricao, preco, estabelecimentoId, imagem } = parse.data;
      // Validação: só o dono do estabelecimento pode cadastrar produtos
      const user = (req as any).user;
      const estabelecimento = await prisma.estabelecimento.findUnique({ where: { id: estabelecimentoId } });
      if (!estabelecimento) {
        res.status(404).json({ error: 'Estabelecimento não encontrado' });
        return;
      }
      // @ts-ignore
      if (!user || user.role !== 'dono' || estabelecimento.donoId !== user.id) {
        res.status(403).json({ error: 'Apenas o dono do estabelecimento pode cadastrar produtos para ele.' });
        return;
      }
      const produto = await prisma.produto.create({
        data: { nome, descricao, preco, estabelecimentoId, imagem },
      });
      res.status(201).json(produto);
      return;
    } catch (error) {
      res.status(400).json({ error: 'Erro ao criar produto', details: error });
      return;
    }
  }

  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { estabelecimentoId } = req.query;
      let produtos;
      if (estabelecimentoId) {
        produtos = await prisma.produto.findMany({ where: { estabelecimentoId: Number(estabelecimentoId) } });
      } else {
        produtos = await prisma.produto.findMany();
      }
      res.json(produtos);
      return;
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar produtos', details: error });
      return;
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const produto = await prisma.produto.findUnique({
        where: { id: Number(id) },
      });
      if (!produto) {
        res.status(404).json({ error: 'Produto não encontrado' });
        return;
      }
      res.json(produto);
      return;
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar produto', details: error });
      return;
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    const parse = produtoSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: 'Dados inválidos', details: parse.error.errors });
      return;
    }
    try {
      const { id } = req.params;
      const { nome, descricao, preco, estabelecimentoId, imagem } = parse.data;
      const produto = await prisma.produto.update({
        where: { id: Number(id) },
        data: { nome, descricao, preco, estabelecimentoId, imagem },
      });
      res.json(produto);
      return;
    } catch (error) {
      res.status(400).json({ error: 'Erro ao atualizar produto', details: error });
      return;
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await prisma.produto.delete({
        where: { id: Number(id) },
      });
      res.status(204).send();
      return;
    } catch (error) {
      res.status(400).json({ error: 'Erro ao deletar produto', details: error });
      return;
    }
  }

  // Atualiza apenas a imagem do produto
  static async updateImagem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { imagem } = req.body;
      if (typeof imagem !== 'string' && imagem !== null) {
        res.status(400).json({ error: 'Imagem deve ser uma string (URL/base64) ou null.' });
        return;
      }
      // Validação: só o dono do estabelecimento pode editar imagem do produto
      const user = (req as any).user;
      const produto = await prisma.produto.findUnique({ where: { id: Number(id) } });
      if (!produto) {
        res.status(404).json({ error: 'Produto não encontrado' });
        return;
      }
      const estabelecimento = await prisma.estabelecimento.findUnique({ where: { id: produto.estabelecimentoId } });
      if (!user || user.role !== 'dono' || estabelecimento?.donoId !== user.id) {
        res.status(403).json({ error: 'Apenas o dono do estabelecimento pode editar a imagem do produto.' });
        return;
      }
      const updated = await prisma.produto.update({
        where: { id: Number(id) },
        data: { imagem },
      });
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: 'Erro ao atualizar imagem do produto', details: error });
    }
  }
}

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class EstabelecimentoController {
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { nome, descricao, endereco } = req.body;
      // Pega o id do usuário autenticado (dono)
      const user = (req as any).user;
      if (!user || user.role !== 'dono') {
        res.status(403).json({ error: 'Apenas usuários com perfil de dono podem criar estabelecimentos.' });
        return;
      }
      const estabelecimento = await prisma.estabelecimento.create({
        data: { nome, descricao, endereco, donoId: user.id },
      });
      res.status(201).json(estabelecimento);
      return;
    } catch (error) {
      res.status(400).json({ error: 'Erro ao criar estabelecimento', details: error });
      return;
    }
  }

  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const estabelecimentos = await prisma.estabelecimento.findMany();
      res.json(estabelecimentos);
      return;
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar estabelecimentos', details: error });
      return;
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const estabelecimento = await prisma.estabelecimento.findUnique({
        where: { id: Number(id) },
      });
      if (!estabelecimento) {
        res.status(404).json({ error: 'Estabelecimento não encontrado' });
        return;
      }
      res.json(estabelecimento);
      return;
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar estabelecimento', details: error });
      return;
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { nome, descricao, endereco } = req.body;
      const estabelecimento = await prisma.estabelecimento.update({
        where: { id: Number(id) },
        data: { nome, descricao, endereco },
      });
      res.json(estabelecimento);
      return;
    } catch (error) {
      res.status(400).json({ error: 'Erro ao atualizar estabelecimento', details: error });
      return;
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await prisma.estabelecimento.delete({
        where: { id: Number(id) },
      });
      res.status(204).send();
      return;
    } catch (error) {
      res.status(400).json({ error: 'Erro ao deletar estabelecimento', details: error });
      return;
    }
  }

  static async listByDono(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      if (!user || user.role !== 'dono') {
        res.status(403).json({ error: 'Apenas donos podem acessar seus estabelecimentos.' });
        return;
      }
      const estabelecimentos = await prisma.estabelecimento.findMany({
        where: { donoId: user.id },
      });
      res.json(estabelecimentos);
      return;
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar estabelecimentos do dono', details: error });
      return;
    }
  }
}

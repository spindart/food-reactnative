import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CategoriaController {
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const categorias = await prisma.categoria.findMany();
      res.json(categorias);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar categorias', details: error });
    }
  }
}

export {};

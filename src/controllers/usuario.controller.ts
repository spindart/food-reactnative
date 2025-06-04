import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class UsuarioController {
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const usuario = await prisma.usuario.findUnique({
        where: { id: Number(id) },
        select: { id: true, nome: true, email: true, role: true },
      });
      if (!usuario) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }
      res.json(usuario);
      return;
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar usuário', details: error });
      return;
    }
  }
}

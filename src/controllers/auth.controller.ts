import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { nome, email, senha, role } = req.body;
      const existing = await prisma.usuario.findUnique({ where: { email } });
      if (existing) {
        res.status(400).json({ error: 'E-mail já cadastrado' });
        return;
      }
      const hashed = await bcrypt.hash(senha, 10);
      const usuario = await prisma.usuario.create({
        data: { nome, email, senha: hashed, role },
      });
      res.status(201).json({ id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role });
    } catch (error) {
      res.status(400).json({ error: 'Erro ao registrar usuário', details: error });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, senha } = req.body;
      const usuario = await prisma.usuario.findUnique({ where: { email } });
      if (!usuario) {
        res.status(401).json({ error: 'Credenciais inválidas' });
        return;
      }
      const valid = await bcrypt.compare(senha, usuario.senha);
      if (!valid) {
        res.status(401).json({ error: 'Credenciais inválidas' });
        return;
      }
      const token = jwt.sign({ id: usuario.id, role: usuario.role }, JWT_SECRET, { expiresIn: '1d' });
      res.json({ token });
    } catch (error) {
      res.status(400).json({ error: 'Erro ao autenticar', details: error });
    }
  }
}

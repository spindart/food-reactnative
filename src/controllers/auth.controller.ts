import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { nome, email, senha, cpf, telefone, role } = req.body;
      
      // Verificar se email já existe
      const existingEmail = await prisma.usuario.findUnique({ where: { email } });
      if (existingEmail) {
        res.status(400).json({ error: 'E-mail já cadastrado' });
        return;
      }

      // Verificar se CPF já existe (se fornecido)
      if (cpf) {
        // Como cpf tem @unique no schema, podemos usar findUnique
        const existingCPF = await prisma.usuario.findUnique({ 
          where: { cpf: cpf as string } 
        });
        if (existingCPF) {
          res.status(400).json({ error: 'CPF já cadastrado' });
          return;
        }
      }

      const hashed = await bcrypt.hash(senha, 10);
      const usuario = await prisma.usuario.create({
        data: { 
          nome, 
          email, 
          senha: hashed, 
          cpf: cpf || null,
          telefone: telefone || null,
          telefoneVerificado: false, // Será verificado via WhatsApp
          role: role || 'cliente'
        },
      });
      res.status(201).json({ 
        id: usuario.id, 
        nome: usuario.nome, 
        email: usuario.email, 
        role: usuario.role,
        cpf: usuario.cpf,
        telefone: usuario.telefone
      });
    } catch (error: any) {
      console.error('Erro ao registrar:', error);
      if (error.code === 'P2002') {
        // Prisma unique constraint violation
        res.status(400).json({ error: 'CPF ou E-mail já cadastrado' });
        return;
      }
      res.status(400).json({ error: 'Erro ao registrar usuário', details: error.message });
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
      const token = jwt.sign({ 
        id: usuario.id, 
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role 
      }, JWT_SECRET, { expiresIn: '1d' });
      res.json({ token });
    } catch (error) {
      res.status(400).json({ error: 'Erro ao autenticar', details: error });
    }
  }
}

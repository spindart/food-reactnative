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

      // Limpar CPF e telefone (remover formatação se houver)
      const cpfLimpo = cpf ? cpf.replace(/\D/g, '') : null;
      const telefoneLimpo = telefone ? telefone.replace(/\D/g, '') : null;

      console.log('📝 Registrando usuário:', {
        nome,
        email,
        cpf: cpfLimpo,
        telefone: telefoneLimpo,
      });

      const hashed = await bcrypt.hash(senha, 10);
      const usuario = await prisma.usuario.create({
        data: { 
          nome, 
          email, 
          senha: hashed, 
          cpf: cpfLimpo || null,
          telefone: telefoneLimpo || null,
          telefoneVerificado: false, // Será verificado via WhatsApp
          emailVerificado: false,
          cpfVerificado: false,
          role: role || 'cliente'
        },
      });

      console.log('✅ Usuário criado:', {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        cpf: usuario.cpf,
        telefone: usuario.telefone,
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
      console.log('📥 Login request body:', JSON.stringify(req.body, null, 2));
      const { email, senha } = req.body;
      
      if (!email || !senha) {
        console.error('❌ Email ou senha ausentes');
        res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
        return;
      }
      
      const usuario = await prisma.usuario.findUnique({ where: { email } });
      if (!usuario) {
        console.error('❌ Usuário não encontrado:', email);
        res.status(401).json({ error: 'Credenciais inválidas' });
        return;
      }
      
      const valid = await bcrypt.compare(senha, usuario.senha);
      if (!valid) {
        console.error('❌ Senha inválida para:', email);
        res.status(401).json({ error: 'Credenciais inválidas' });
        return;
      }
      
      const token = jwt.sign({ 
        id: usuario.id, 
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role 
      }, JWT_SECRET, { expiresIn: '1d' });
      
      console.log('✅ Login bem-sucedido para:', email);
      res.json({ token });
    } catch (error: any) {
      console.error('❌ Erro ao autenticar:', error);
      res.status(500).json({ error: 'Erro ao autenticar', details: error.message });
    }
  }
}

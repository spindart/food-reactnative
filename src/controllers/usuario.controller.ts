import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export class UsuarioController {
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const usuario = await prisma.usuario.findUnique({
        where: { id: Number(id) },
        select: { id: true, nome: true, email: true, role: true, mercadoPagoCustomerId: true },
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

  /**
   * GET /api/usuarios/perfil
   * Retorna o perfil completo do usuário autenticado
   */
  static async getPerfil(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;
      console.log('📥 GET /perfil - userId:', userId, 'tipo:', typeof userId);
      console.log('📥 req.user completo:', JSON.stringify(req.user, null, 2));
      
      if (!userId) {
        console.error('❌ Usuário não autenticado');
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      // Garantir que userId seja número
      const userIdNumber = typeof userId === 'string' ? parseInt(userId, 10) : userId;
      
      if (isNaN(userIdNumber)) {
        console.error('❌ userId inválido:', userId);
        res.status(400).json({ error: 'ID de usuário inválido' });
        return;
      }

      console.log('🔍 Buscando usuário com id:', userIdNumber);
      
      try {
        const usuario = await prisma.usuario.findUnique({
          where: { id: userIdNumber },
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
            cpf: true,
            cpfVerificado: true,
            telefoneVerificado: true,
            emailVerificado: true,
            dataNascimento: true,
            genero: true,
            fotoPerfil: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!usuario) {
          console.error('❌ Usuário não encontrado com id:', userId);
          res.status(404).json({ error: 'Usuário não encontrado' });
          return;
        }

        console.log('✅ Perfil encontrado:', usuario.email);
        console.log('📋 Dados do perfil:', JSON.stringify({
          nome: usuario.nome,
          email: usuario.email,
          telefone: usuario.telefone,
          cpf: usuario.cpf,
          cpfVerificado: usuario.cpfVerificado,
          telefoneVerificado: usuario.telefoneVerificado,
        }, null, 2));
        res.json(usuario);
      } catch (prismaError: any) {
        console.error('❌ Erro do Prisma:', prismaError);
        console.error('❌ Código do erro:', prismaError.code);
        console.error('❌ Meta do erro:', prismaError.meta);
        throw prismaError;
      }
    } catch (error: any) {
      console.error('❌ Erro ao buscar perfil:', error);
      console.error('❌ Stack:', error.stack);
      res.status(500).json({ 
        error: 'Erro ao buscar perfil', 
        details: error.message,
        code: error.code 
      });
    }
  }

  /**
   * PUT /api/usuarios/perfil
   * Atualiza o perfil do usuário autenticado
   */
  static async updatePerfil(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      // Garantir que userId seja número
      const userIdNumber = typeof userId === 'string' ? parseInt(userId, 10) : userId;
      
      if (isNaN(userIdNumber)) {
        res.status(400).json({ error: 'ID de usuário inválido' });
        return;
      }

      const { nome, email, telefone, cpf, dataNascimento, genero, fotoPerfil } = req.body;
      
      console.log('📥 Dados recebidos para atualização:', {
        nome,
        email,
        telefone,
        cpf,
        dataNascimento,
        genero,
      });

      // Buscar usuário atual
      const usuarioAtual = await prisma.usuario.findUnique({
        where: { id: userIdNumber },
      });

      if (!usuarioAtual) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }

      // Preparar dados de atualização
      const updateData: any = {};

      // Validar e atualizar nome
      if (nome !== undefined && nome.trim().length > 0) {
        updateData.nome = nome.trim();
      }

      // Validar e atualizar e-mail
      if (email !== undefined && email !== usuarioAtual.email) {
        // Verificar se o e-mail já existe
        const emailExists = await prisma.usuario.findUnique({
          where: { email },
        });

        if (emailExists && emailExists.id !== userIdNumber) {
          res.status(400).json({ error: 'Este e-mail já está em uso' });
          return;
        }

        updateData.email = email.trim();
        updateData.emailVerificado = false; // Requer revalidação
      }

      // Validar e atualizar telefone
      if (telefone !== undefined && telefone !== usuarioAtual.telefone) {
        // Limpar telefone (remover caracteres não numéricos)
        const cleanTelefone = telefone.replace(/\D/g, '');
        
        if (cleanTelefone.length > 0 && cleanTelefone.length !== 10 && cleanTelefone.length !== 11) {
          res.status(400).json({ error: 'Telefone inválido. Deve ter 10 ou 11 dígitos' });
          return;
        }

        updateData.telefone = cleanTelefone || null;
        updateData.telefoneVerificado = false; // Requer revalidação se mudou
      }

      // Validar e atualizar CPF (apenas se não estiver verificado)
      if (cpf !== undefined && !usuarioAtual.cpfVerificado) {
        // Limpar CPF (remover formatação)
        const cleanCPF = cpf ? cpf.replace(/\D/g, '') : null;
        
        if (cleanCPF && cleanCPF.length !== 11) {
          res.status(400).json({ error: 'CPF deve ter 11 dígitos' });
          return;
        }

        // Verificar se CPF já existe (se fornecido)
        if (cleanCPF && cleanCPF !== usuarioAtual.cpf) {
          const cpfExists = await prisma.usuario.findUnique({
            where: { cpf: cleanCPF },
          });

          if (cpfExists && cpfExists.id !== userIdNumber) {
            res.status(400).json({ error: 'Este CPF já está em uso' });
            return;
          }
        }

        updateData.cpf = cleanCPF || null;
      } else if (cpf !== undefined && usuarioAtual.cpfVerificado) {
        // Se o CPF está verificado, não pode ser alterado
        console.log('⚠️ Tentativa de alterar CPF verificado - ignorando');
      }

      // Validar e atualizar data de nascimento
      if (dataNascimento !== undefined) {
        if (dataNascimento === null || dataNascimento === '') {
          updateData.dataNascimento = null;
        } else {
          const data = new Date(dataNascimento);
          if (isNaN(data.getTime())) {
            res.status(400).json({ error: 'Data de nascimento inválida' });
            return;
          }
          // Verificar se a data não é futura
          if (data > new Date()) {
            res.status(400).json({ error: 'Data de nascimento não pode ser futura' });
            return;
          }
          updateData.dataNascimento = data;
        }
      }

      // Validar e atualizar gênero
      if (genero !== undefined) {
        const generosValidos = ['masculino', 'feminino', 'outro', 'prefiro_não_informar'];
        if (genero !== null && genero !== '' && !generosValidos.includes(genero)) {
          res.status(400).json({ error: 'Gênero inválido' });
          return;
        }
        updateData.genero = genero || null;
      }

      // Atualizar foto de perfil
      if (fotoPerfil !== undefined) {
        updateData.fotoPerfil = fotoPerfil || null;
      }

      // Atualizar usuário
      const usuarioAtualizado = await prisma.usuario.update({
        where: { id: userIdNumber },
        data: updateData,
        select: {
          id: true,
          nome: true,
          email: true,
          telefone: true,
          cpf: true,
          cpfVerificado: true,
          telefoneVerificado: true,
          emailVerificado: true,
          dataNascimento: true,
          genero: true,
          fotoPerfil: true,
          role: true,
          updatedAt: true,
        },
      });

      // Log da alteração
      console.log(`📝 Perfil atualizado pelo usuário ${userIdNumber}:`, Object.keys(updateData).join(', '));

      res.json({
        message: 'Dados atualizados com sucesso!',
        usuario: usuarioAtualizado,
      });
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      res.status(500).json({ error: 'Erro ao atualizar perfil', details: error.message });
    }
  }

  /**
   * PUT /api/usuarios/perfil/senha
   * Altera a senha do usuário autenticado
   */
  static async alterarSenha(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      // Garantir que userId seja número
      const userIdNumber = typeof userId === 'string' ? parseInt(userId, 10) : userId;
      
      if (isNaN(userIdNumber)) {
        res.status(400).json({ error: 'ID de usuário inválido' });
        return;
      }

      const { senhaAtual, novaSenha, confirmarSenha } = req.body;

      // Validações
      if (!senhaAtual || !novaSenha || !confirmarSenha) {
        res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        return;
      }

      if (novaSenha.length < 6) {
        res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres' });
        return;
      }

      if (novaSenha !== confirmarSenha) {
        res.status(400).json({ error: 'A nova senha e a confirmação não coincidem' });
        return;
      }

      // Buscar usuário atual
      const usuarioAtual = await prisma.usuario.findUnique({
        where: { id: userIdNumber },
        select: { id: true, senha: true, email: true },
      });

      if (!usuarioAtual) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }

      // Verificar senha atual
      const senhaAtualValida = await bcrypt.compare(senhaAtual, usuarioAtual.senha);
      
      if (!senhaAtualValida) {
        res.status(401).json({ error: 'Senha atual incorreta' });
        return;
      }

      // Verificar se a nova senha é diferente da atual
      const mesmaSenha = await bcrypt.compare(novaSenha, usuarioAtual.senha);
      
      if (mesmaSenha) {
        res.status(400).json({ error: 'A nova senha deve ser diferente da senha atual' });
        return;
      }

      // Hash da nova senha
      const novaSenhaHash = await bcrypt.hash(novaSenha, 10);

      // Atualizar senha
      await prisma.usuario.update({
        where: { id: userIdNumber },
        data: { senha: novaSenhaHash },
      });

      console.log(`🔐 Senha alterada pelo usuário ${userIdNumber} (${usuarioAtual.email})`);

      res.json({
        message: 'Senha alterada com sucesso!',
      });
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      res.status(500).json({ error: 'Erro ao alterar senha', details: error.message });
    }
  }
}

import { Request, Response } from 'express';
import { ChatService } from '../services/chat.service';
import { NotificationService } from '../services/notification.service';
import { NotificationDBService } from '../services/notification-db.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ChatController {
  /**
   * GET /api/chat/pedido/:pedidoId
   * Obtém mensagens de uma conversa de pedido
   */
  static async getConversa(req: Request, res: Response): Promise<void> {
    try {
      const { pedidoId } = req.params;
      const userId = (req.user as any)?.id;

      if (!userId) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      const pedidoIdNum = parseInt(pedidoId);
      if (isNaN(pedidoIdNum)) {
        res.status(400).json({ error: 'ID de pedido inválido' });
        return;
      }

      // Verifica se usuário tem acesso ao pedido
      const pedido = await prisma.pedido.findUnique({
        where: { id: pedidoIdNum },
        include: {
          estabelecimento: {
            select: { donoId: true },
          },
        },
      });

      if (!pedido) {
        res.status(404).json({ error: 'Pedido não encontrado' });
        return;
      }

      const isCliente = pedido.clienteId === userId;
      const isDono = pedido.estabelecimento.donoId === userId;

      if (!isCliente && !isDono) {
        res.status(403).json({ error: 'Acesso negado' });
        return;
      }

      const conversa = await ChatService.getMensagens(pedidoIdNum);

      if (!conversa) {
        // Retorna estrutura vazia se conversa não existe ainda
        const pedidoCompleto = await prisma.pedido.findUnique({
          where: { id: pedidoIdNum },
          include: {
            estabelecimento: {
              select: {
                id: true,
                nome: true,
                imagem: true,
              },
            },
            cliente: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        });

        res.json({
          id: null,
          pedidoId: pedidoIdNum,
          mensagens: [],
          pedido: pedidoCompleto,
          canSend: true,
        });
        return;
      }

      // Marca mensagens como lidas
      await ChatService.markAsRead(pedidoIdNum, userId);

      // Verifica se pode enviar mensagens
      const { canSend, reason } = await ChatService.canSendMessage(pedidoIdNum);

      res.json({
        ...conversa,
        canSend,
        reason: canSend ? undefined : reason,
      });
    } catch (error: any) {
      console.error('Erro ao buscar conversa:', error);
      res.status(500).json({ error: error.message || 'Erro ao buscar conversa' });
    }
  }

  /**
   * POST /api/chat/pedido/:pedidoId/mensagem
   * Envia uma mensagem no chat
   */
  static async sendMensagem(req: Request, res: Response): Promise<void> {
    try {
      const { pedidoId } = req.params;
      const { texto, imagemUrl } = req.body;
      const userId = (req.user as any)?.id;

      if (!userId) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      const pedidoIdNum = parseInt(pedidoId);
      if (isNaN(pedidoIdNum)) {
        res.status(400).json({ error: 'ID de pedido inválido' });
        return;
      }

      // Verifica se usuário tem acesso ao pedido
      const pedido = await prisma.pedido.findUnique({
        where: { id: pedidoIdNum },
        include: {
          estabelecimento: {
            select: { donoId: true },
          },
        },
      });

      if (!pedido) {
        res.status(404).json({ error: 'Pedido não encontrado' });
        return;
      }

      const isCliente = pedido.clienteId === userId;
      const isDono = pedido.estabelecimento.donoId === userId;

      if (!isCliente && !isDono) {
        res.status(403).json({ error: 'Acesso negado' });
        return;
      }

      if (!texto && !imagemUrl) {
        res.status(400).json({ error: 'Mensagem deve conter texto ou imagem' });
        return;
      }

      const mensagem = await ChatService.sendMessage(pedidoIdNum, userId, texto, imagemUrl);

      // Notifica via WebSocket
      NotificationService.notifyChatMessage(pedidoIdNum, mensagem);

      // Criar notificação se mensagem for do estabelecimento para o cliente
      if (mensagem.isFromEstabelecimento) {
        try {
          const pedidoCompleto = await prisma.pedido.findUnique({
            where: { id: pedidoIdNum },
            include: {
              estabelecimento: {
                select: {
                  nome: true,
                },
              },
            },
          });

          if (pedidoCompleto) {
            await NotificationDBService.notificarMensagemRestaurante(
              pedidoCompleto.clienteId,
              pedidoIdNum,
              pedidoCompleto.estabelecimento.nome
            );
          }
        } catch (notifError) {
          console.error('Erro ao criar notificação de mensagem:', notifError);
          // Não falha o envio da mensagem se a notificação falhar
        }
      }

      res.status(201).json(mensagem);
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      res.status(400).json({ error: error.message || 'Erro ao enviar mensagem' });
    }
  }

  /**
   * GET /api/chat/conversas
   * Lista conversas do usuário (cliente ou estabelecimento)
   */
  static async listConversas(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;

      if (!userId) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      // Verifica se é dono de algum estabelecimento
      const estabelecimentos = await prisma.estabelecimento.findMany({
        where: { donoId: userId },
        select: { id: true, nome: true },
      });

      console.log('👤 User ID:', userId);
      console.log('🏪 Estabelecimentos encontrados:', estabelecimentos.length, estabelecimentos.map(e => ({ id: e.id, nome: e.nome })));

      if (estabelecimentos.length > 0) {
        // É dono - busca conversas de TODOS os estabelecimentos do usuário
        const todasConversas = await Promise.all(
          estabelecimentos.map(est => ChatService.listConversasEstabelecimento(est.id))
        );
        
        // Flatten array e ordena primeiro por estabelecimento, depois por última mensagem
        const conversas = todasConversas.flat().sort((a: any, b: any) => {
          // Primeiro ordena por estabelecimento
          const estabelecimentoA = a.pedido?.estabelecimento?.nome || '';
          const estabelecimentoB = b.pedido?.estabelecimento?.nome || '';
          
          if (estabelecimentoA !== estabelecimentoB) {
            return estabelecimentoA.localeCompare(estabelecimentoB);
          }
          
          // Se mesmo estabelecimento, ordena por última mensagem
          const dataA = a.ultimaMensagemAt ? new Date(a.ultimaMensagemAt).getTime() : new Date(a.createdAt).getTime();
          const dataB = b.ultimaMensagemAt ? new Date(b.ultimaMensagemAt).getTime() : new Date(b.createdAt).getTime();
          return dataB - dataA;
        });
        
        console.log('📨 Total de conversas retornadas:', conversas.length);
        res.json(conversas);
      } else {
        // É cliente - retorna conversas do cliente
        const conversas = await ChatService.listConversasCliente(userId);
        res.json(conversas);
      }
    } catch (error: any) {
      console.error('Erro ao listar conversas:', error);
      res.status(500).json({ error: error.message || 'Erro ao listar conversas' });
    }
  }

  /**
   * POST /api/chat/pedido/:pedidoId/marcar-lido
   * Marca mensagens como lidas
   */
  static async marcarLido(req: Request, res: Response): Promise<void> {
    try {
      const { pedidoId } = req.params;
      const userId = (req.user as any)?.id;

      if (!userId) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      const pedidoIdNum = parseInt(pedidoId);
      if (isNaN(pedidoIdNum)) {
        res.status(400).json({ error: 'ID de pedido inválido' });
        return;
      }

      await ChatService.markAsRead(pedidoIdNum, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Erro ao marcar como lido:', error);
      res.status(500).json({ error: error.message || 'Erro ao marcar como lido' });
    }
  }

  /**
   * GET /api/chat/templates
   * Retorna templates de mensagens rápidas para estabelecimento
   */
  static async getTemplates(req: Request, res: Response): Promise<void> {
    const templates = [
      { id: 1, texto: 'Pedido em preparo' },
      { id: 2, texto: 'Pedido a caminho' },
      { id: 3, texto: 'Pode pegar na portaria?' },
      { id: 4, texto: 'Pedido chegando em breve' },
      { id: 5, texto: 'Estamos preparando seu pedido com carinho!' },
      { id: 6, texto: 'Seu pedido saiu para entrega' },
    ];

    res.json(templates);
  }
}


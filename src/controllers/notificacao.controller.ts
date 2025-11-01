import { Request, Response } from 'express';
import { NotificationDBService } from '../services/notification-db.service';
import { NotificationService } from '../services/notification.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NotificacaoController {
  /**
   * GET /api/notificacoes
   * Lista notificações do usuário
   */
  static async listarNotificacoes(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;
      const { apenasNaoLidas } = req.query;

      if (!userId) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      const notificacoes = await NotificationDBService.listarNotificacoes(
        userId,
        apenasNaoLidas === 'true'
      );

      res.json(notificacoes);
    } catch (error: any) {
      console.error('Erro ao listar notificações:', error);
      res.status(500).json({ error: error.message || 'Erro ao listar notificações' });
    }
  }

  /**
   * GET /api/notificacoes/nao-lidas
   * Conta notificações não lidas
   */
  static async contarNaoLidas(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;

      if (!userId) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      const count = await NotificationDBService.contarNaoLidas(userId);
      res.json({ count });
    } catch (error: any) {
      console.error('Erro ao contar notificações não lidas:', error);
      res.status(500).json({ error: error.message || 'Erro ao contar notificações' });
    }
  }

  /**
   * POST /api/notificacoes/:id/marcar-lida
   * Marca notificação como lida
   */
  static async marcarComoLida(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req.user as any)?.id;

      if (!userId) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      const notificacaoId = parseInt(id);
      if (isNaN(notificacaoId)) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }

      await NotificationDBService.marcarComoLida(notificacaoId, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Erro ao marcar notificação como lida:', error);
      res.status(500).json({ error: error.message || 'Erro ao marcar como lida' });
    }
  }

  /**
   * POST /api/notificacoes/marcar-todas-lidas
   * Marca todas as notificações como lidas
   */
  static async marcarTodasComoLidas(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;

      if (!userId) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      await NotificationDBService.marcarTodasComoLidas(userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Erro ao marcar todas como lidas:', error);
      res.status(500).json({ error: error.message || 'Erro ao marcar todas como lidas' });
    }
  }

  /**
   * DELETE /api/notificacoes/:id
   * Deleta notificação
   */
  static async deletarNotificacao(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req.user as any)?.id;

      if (!userId) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      const notificacaoId = parseInt(id);
      if (isNaN(notificacaoId)) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }

      await NotificationDBService.deletarNotificacao(notificacaoId, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Erro ao deletar notificação:', error);
      res.status(500).json({ error: error.message || 'Erro ao deletar notificação' });
    }
  }

  /**
   * POST /api/notificacoes/token
   * Salva ou atualiza o push token do usuário
   */
  static async salvarPushToken(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;
      const { token } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      if (!token) {
        res.status(400).json({ error: 'Token é obrigatório' });
        return;
      }

      // Atualizar o token do usuário
      await prisma.usuario.update({
        where: { id: userId },
        data: { expoPushToken: token },
      });

      console.log(`✅ Push token salvo para usuário ${userId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Erro ao salvar push token:', error);
      res.status(500).json({ error: error.message || 'Erro ao salvar push token' });
    }
  }
}


import { PrismaClient, TipoNotificacao } from '@prisma/client';
import { NotificationService } from './notification.service';
import { sendPushNotification } from './push-notification.service';

const prisma = new PrismaClient();

export interface CriarNotificacaoData {
  usuarioId: number;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  pedidoId?: number;
}

export class NotificationDBService {
  /**
   * Cria uma nova notificação
   */
  static async criarNotificacao(dados: CriarNotificacaoData) {
    const notificacao = await prisma.notificacao.create({
      data: {
        usuarioId: dados.usuarioId,
        tipo: dados.tipo,
        titulo: dados.titulo,
        mensagem: dados.mensagem,
        pedidoId: dados.pedidoId || null,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        pedido: {
          select: {
            id: true,
            status: true,
            estabelecimento: {
              select: {
                id: true,
                nome: true,
                imagem: true,
              },
            },
          },
        },
      },
    });

    // Notifica via WebSocket
    NotificationService.notifyNewNotification(notificacao);

    // Enviar push notification (se o usuário tiver token)
    try {
      const usuario = await prisma.usuario.findUnique({
        where: { id: dados.usuarioId },
        select: { expoPushToken: true },
      });

      if (usuario?.expoPushToken) {
        await sendPushNotification({
          to: usuario.expoPushToken,
          title: dados.titulo,
          body: dados.mensagem,
          data: {
            notificacaoId: notificacao.id,
            tipo: dados.tipo,
            pedidoId: dados.pedidoId,
          },
          priority: 'high',
        });
      }
    } catch (pushError: any) {
      // Não falha a criação da notificação se o push falhar
      console.error('Erro ao enviar push notification:', pushError);
    }

    return notificacao;
  }

  /**
   * Notificação de status do pedido
   */
  static async notificarStatusPedido(
    usuarioId: number,
    pedidoId: number,
    status: string,
    estabelecimentoNome?: string
  ) {
    const mensagens: Record<string, { titulo: string; mensagem: string }> = {
      pendente: {
        titulo: 'Pedido recebido! 🎉',
        mensagem: 'Seu pedido foi recebido e está sendo processado',
      },
      preparo: {
        titulo: 'Pedido em preparo! 🍳',
        mensagem: `Seu pedido${estabelecimentoNome ? ` de ${estabelecimentoNome}` : ''} está sendo preparado`,
      },
      em_entrega: {
        titulo: 'Saiu para entrega! 🚗💨',
        mensagem: `Seu pedido${estabelecimentoNome ? ` de ${estabelecimentoNome}` : ''} saiu para entrega e está a caminho!`,
      },
      entregue: {
        titulo: 'Pedido entregue! ✅',
        mensagem: `Seu pedido${estabelecimentoNome ? ` de ${estabelecimentoNome}` : ''} foi entregue. Aproveite!`,
      },
      cancelado: {
        titulo: 'Pedido cancelado',
        mensagem: 'Seu pedido foi cancelado',
      },
    };

    const msg = mensagens[status] || {
      titulo: 'Atualização do pedido',
      mensagem: `Status do pedido atualizado para: ${status}`,
    };

    return this.criarNotificacao({
      usuarioId,
      tipo: 'STATUS_PEDIDO',
      titulo: msg.titulo,
      mensagem: msg.mensagem,
      pedidoId,
    });
  }

  /**
   * Notificação de mensagem do restaurante
   */
  static async notificarMensagemRestaurante(
    usuarioId: number,
    pedidoId: number,
    nomeRestaurante: string
  ) {
    return this.criarNotificacao({
      usuarioId,
      tipo: 'MENSAGEM_RESTAURANTE',
      titulo: 'Nova mensagem do restaurante 💬',
      mensagem: `${nomeRestaurante} enviou uma mensagem sobre seu pedido`,
      pedidoId,
    });
  }

  /**
   * Notificação de pagamento confirmado
   */
  static async notificarPagamentoConfirmado(usuarioId: number, pedidoId: number) {
    return this.criarNotificacao({
      usuarioId,
      tipo: 'EVENTO_SISTEMA',
      titulo: 'Pagamento confirmado! ✅',
      mensagem: 'Seu pagamento foi aprovado e o pedido está sendo processado',
      pedidoId,
    });
  }

  /**
   * Lista notificações de um usuário
   */
  static async listarNotificacoes(usuarioId: number, apenasNaoLidas?: boolean) {
    const where: any = { usuarioId };
    if (apenasNaoLidas) {
      where.lida = false;
    }

    const notificacoes = await prisma.notificacao.findMany({
      where,
      include: {
        pedido: {
          select: {
            id: true,
            status: true,
            estabelecimento: {
              select: {
                id: true,
                nome: true,
                imagem: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return notificacoes;
  }

  /**
   * Conta notificações não lidas
   */
  static async contarNaoLidas(usuarioId: number): Promise<number> {
    return prisma.notificacao.count({
      where: {
        usuarioId,
        lida: false,
      },
    });
  }

  /**
   * Marca notificação como lida
   */
  static async marcarComoLida(notificacaoId: number, usuarioId: number) {
    return prisma.notificacao.updateMany({
      where: {
        id: notificacaoId,
        usuarioId, // Segurança: só pode marcar suas próprias notificações
      },
      data: {
        lida: true,
        lidaEm: new Date(),
      },
    });
  }

  /**
   * Marca todas como lidas
   */
  static async marcarTodasComoLidas(usuarioId: number) {
    return prisma.notificacao.updateMany({
      where: {
        usuarioId,
        lida: false,
      },
      data: {
        lida: true,
        lidaEm: new Date(),
      },
    });
  }

  /**
   * Deleta notificação
   */
  static async deletarNotificacao(notificacaoId: number, usuarioId: number) {
    return prisma.notificacao.deleteMany({
      where: {
        id: notificacaoId,
        usuarioId, // Segurança: só pode deletar suas próprias notificações
      },
    });
  }
}


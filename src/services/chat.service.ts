import { PrismaClient, Status } from '@prisma/client';

const prisma = new PrismaClient();

export class ChatService {
  /**
   * Verifica se o chat pode ser iniciado/enviar mensagens
   * Regras:
   * - Chat só pode ser iniciado após pedido confirmado (status != pendente)
   * - Chat bloqueado se pedido cancelado
   * - Chat bloqueado 24h após pedido entregue
   */
  static async canSendMessage(pedidoId: number): Promise<{ canSend: boolean; reason?: string }> {
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
    });

    if (!pedido) {
      return { canSend: false, reason: 'Pedido não encontrado' };
    }

    // Se pedido está pendente (não confirmado), não pode iniciar chat
    if (pedido.status === 'pendente') {
      return { canSend: false, reason: 'Chat só pode ser iniciado após confirmação do pedido' };
    }

    // Se pedido foi cancelado, bloqueia chat
    if (pedido.status === 'cancelado') {
      return { canSend: false, reason: 'Chat bloqueado para pedidos cancelados' };
    }

    // Se pedido foi entregue, verifica se passou 24h
    if (pedido.status === 'entregue') {
      const agora = new Date();
      const entregueAt = pedido.createdAt; // Usando createdAt como referência, mas idealmente deveria ter um campo updatedAt no status
      const diffMs = agora.getTime() - entregueAt.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours > 24) {
        return { canSend: false, reason: 'Chat encerrado 24h após entrega do pedido' };
      }
    }

    return { canSend: true };
  }

  /**
   * Cria ou retorna conversa existente para um pedido
   */
  static async getOrCreateConversa(pedidoId: number) {
    let conversa = await prisma.conversa.findUnique({
      where: { pedidoId },
      include: {
        mensagens: {
          include: {
            remetente: {
              select: {
                id: true,
                nome: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        pedido: {
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
        },
      },
    });

    if (!conversa) {
      // Verifica se pode criar conversa
      const { canSend, reason } = await this.canSendMessage(pedidoId);
      if (!canSend) {
        throw new Error(reason);
      }

      conversa = await prisma.conversa.create({
        data: {
          pedidoId,
        },
        include: {
          mensagens: {
            include: {
              remetente: {
                select: {
                  id: true,
                  nome: true,
                  role: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
          pedido: {
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
          },
        },
      });
    }

    return conversa;
  }

  /**
   * Envia uma mensagem no chat
   */
  static async sendMessage(
    pedidoId: number,
    remetenteId: number,
    texto?: string,
    imagemUrl?: string
  ) {
    // Verifica se pode enviar mensagem
    const { canSend, reason } = await this.canSendMessage(pedidoId);
    if (!canSend) {
      throw new Error(reason);
    }

    if (!texto && !imagemUrl) {
      throw new Error('Mensagem deve conter texto ou imagem');
    }

    // Busca pedido para determinar se remetente é estabelecimento
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        estabelecimento: {
          select: {
            donoId: true,
          },
        },
      },
    });

    if (!pedido) {
      throw new Error('Pedido não encontrado');
    }

    const isFromEstabelecimento = pedido.estabelecimento.donoId === remetenteId;

    // Garante que a conversa existe
    const conversa = await this.getOrCreateConversa(pedidoId);

    // Cria mensagem
    const mensagem = await prisma.mensagem.create({
      data: {
        conversaId: conversa.id,
        remetenteId,
        texto: texto || null,
        imagemUrl: imagemUrl || null,
        isFromEstabelecimento,
        status: 'enviado',
      },
      include: {
        remetente: {
          select: {
            id: true,
            nome: true,
            role: true,
          },
        },
      },
    });

    // Atualiza última mensagem da conversa
    await prisma.conversa.update({
      where: { id: conversa.id },
      data: {
        ultimaMensagemAt: new Date(),
      },
    });

    return mensagem;
  }

  /**
   * Marca mensagens como recebidas/lidas
   */
  static async markAsRead(pedidoId: number, userId: number) {
    const conversa = await prisma.conversa.findUnique({
      where: { pedidoId },
    });

    if (!conversa) {
      return;
    }

    // Marca como lida todas as mensagens que não são do usuário atual
    await prisma.mensagem.updateMany({
      where: {
        conversaId: conversa.id,
        remetenteId: { not: userId },
        status: { not: 'lido' },
      },
      data: {
        status: 'lido',
        lidaEm: new Date(),
      },
    });
  }

  /**
   * Lista conversas ativas para um estabelecimento
   */
  static async listConversasEstabelecimento(estabelecimentoId: number) {
    console.log('🔍 Buscando conversas para estabelecimento:', estabelecimentoId);
    
    // Buscar todos os pedidos do estabelecimento primeiro
    const pedidosIds = await prisma.pedido.findMany({
      where: { estabelecimentoId },
      select: { id: true },
    });
    
    const pedidosIdsArray = pedidosIds.map(p => p.id);
    console.log('📦 IDs dos pedidos:', pedidosIdsArray);
    
    if (pedidosIdsArray.length === 0) {
      console.log('⚠️ Nenhum pedido encontrado para este estabelecimento');
      return [];
    }
    
    // Buscar conversas dos pedidos
    const conversas = await prisma.conversa.findMany({
      where: {
        pedidoId: {
          in: pedidosIdsArray,
        },
      },
      include: {
        pedido: {
          include: {
            cliente: {
              select: {
                id: true,
                nome: true,
              },
            },
            estabelecimento: {
              select: {
                id: true,
                nome: true,
                imagem: true,
              },
            },
          },
        },
        mensagens: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          include: {
            remetente: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    console.log('📋 Conversas encontradas:', conversas.length);

    // Calcula quantidade de mensagens não lidas para cada conversa
    const conversasComUnread = await Promise.all(
      conversas.map(async (conversa: any) => {
        const donoEstabelecimento = await prisma.estabelecimento.findUnique({
          where: { id: estabelecimentoId },
          select: { donoId: true },
        });

        if (!donoEstabelecimento) {
          return { ...conversa, unreadCount: 0 };
        }

        const unreadCount = await prisma.mensagem.count({
          where: {
            conversaId: conversa.id,
            remetenteId: { not: donoEstabelecimento.donoId },
            status: { not: 'lido' },
          },
        });

        return { ...conversa, unreadCount };
      })
    );
    
    console.log('✅ Conversas processadas (estabelecimento):', conversasComUnread.length);

    return conversasComUnread;
  }

  /**
   * Lista conversas para um cliente
   */
  static async listConversasCliente(clienteId: number) {
    const conversas = await prisma.conversa.findMany({
      where: {
        pedido: {
          clienteId,
        },
      },
      include: {
        pedido: {
          include: {
            estabelecimento: {
              select: {
                id: true,
                nome: true,
                imagem: true,
              },
            },
          },
        },
        mensagens: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          include: {
            remetente: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    console.log('📋 Conversas encontradas:', conversas.length);

    // Calcula quantidade de mensagens não lidas
    const conversasComUnread = await Promise.all(
      conversas.map(async (conversa: any) => {
        const unreadCount = await prisma.mensagem.count({
          where: {
            conversaId: conversa.id,
            remetenteId: { not: clienteId },
            status: { not: 'lido' },
          },
        });

        return { ...conversa, unreadCount };
      })
    );

    return conversasComUnread;
  }

  /**
   * Obtém mensagens de uma conversa
   */
  static async getMensagens(pedidoId: number) {
    const conversa = await prisma.conversa.findUnique({
      where: { pedidoId },
      include: {
        mensagens: {
          include: {
            remetente: {
              select: {
                id: true,
                nome: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        pedido: {
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
        },
      },
    });

    return conversa;
  }
}


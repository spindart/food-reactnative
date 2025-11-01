import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CriarAvaliacaoData {
  pedidoId: number;
  usuarioId: number;
  nota: number; // 1 a 5
  notaEntregador?: number; // 1 a 5 (opcional)
  comentario?: string;
  motivos?: string[];
}

/**
 * Motivos pré-definidos para avaliação
 */
export const MOTIVOS_POSITIVOS = [
  'Excelente atendimento',
  'Comida deliciosa',
  'Entrega rápida',
  'Embalagem perfeita',
  'Pedido completo',
  'Superou expectativas',
];

export const MOTIVOS_NEGATIVOS = [
  'Demorado',
  'Comida fria',
  'Embalagem ruim',
  'Pedido incompleto',
  'Atendimento ruim',
  'Comida diferente do esperado',
];

export class AvaliacaoService {
  /**
   * Verifica se o usuário pode avaliar um pedido
   */
  static async canAvaliar(pedidoId: number, usuarioId: number): Promise<{
    canAvaliar: boolean;
    reason?: string;
  }> {
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        avaliacao: true,
      },
    });

    if (!pedido) {
      return { canAvaliar: false, reason: 'Pedido não encontrado' };
    }

    // Verificar se o pedido pertence ao usuário
    if (pedido.clienteId !== usuarioId) {
      return { canAvaliar: false, reason: 'Pedido não pertence a este usuário' };
    }

    // Verificar se o pedido está entregue
    if (pedido.status !== 'entregue') {
      return { canAvaliar: false, reason: 'Pedido ainda não foi entregue' };
    }

    // Verificar se já existe avaliação
    if (pedido.avaliacao) {
      return { canAvaliar: false, reason: 'Pedido já foi avaliado' };
    }

    return { canAvaliar: true };
  }

  /**
   * Verifica se ainda está dentro do prazo de 30 minutos após entrega
   */
  static async isWithinEvaluationWindow(pedidoId: number): Promise<boolean> {
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      select: { entregueEm: true },
    });

    if (!pedido || !pedido.entregueEm) {
      return false;
    }

    const entregueEm = new Date(pedido.entregueEm);
    const agora = new Date();
    const diffMinutes = (agora.getTime() - entregueEm.getTime()) / (1000 * 60);

    return diffMinutes <= 30;
  }

  /**
   * Cria uma avaliação e atualiza os ratings do estabelecimento
   */
  static async criarAvaliacao(data: CriarAvaliacaoData) {
    // Validar se pode avaliar
    const canAvaliar = await this.canAvaliar(data.pedidoId, data.usuarioId);
    if (!canAvaliar.canAvaliar) {
      throw new Error(canAvaliar.reason || 'Não é possível avaliar este pedido');
    }

    // Validar nota (1 a 5)
    if (data.nota < 1 || data.nota > 5) {
      throw new Error('Nota deve ser entre 1 e 5');
    }

    // Validar nota do entregador se fornecida
    if (data.notaEntregador && (data.notaEntregador < 1 || data.notaEntregador > 5)) {
      throw new Error('Nota do entregador deve ser entre 1 e 5');
    }

    // Buscar pedido para obter estabelecimentoId
    const pedido = await prisma.pedido.findUnique({
      where: { id: data.pedidoId },
      select: { estabelecimentoId: true },
    });

    if (!pedido) {
      throw new Error('Pedido não encontrado');
    }

    // Criar avaliação
    const avaliacao = await prisma.avaliacao.create({
      data: {
        pedidoId: data.pedidoId,
        estabelecimentoId: pedido.estabelecimentoId,
        usuarioId: data.usuarioId,
        nota: data.nota,
        notaEntregador: data.notaEntregador,
        comentario: data.comentario,
        motivos: data.motivos || [],
      },
      include: {
        estabelecimento: true,
        pedido: true,
      },
    });

    // Atualizar rating do estabelecimento
    await this.atualizarRatingEstabelecimento(pedido.estabelecimentoId);

    return avaliacao;
  }

  /**
   * Atualiza o rating médio do estabelecimento baseado em todas as avaliações
   */
  static async atualizarRatingEstabelecimento(estabelecimentoId: number) {
    const avaliacoes = await prisma.avaliacao.findMany({
      where: { estabelecimentoId },
      select: { nota: true },
    });

    if (avaliacoes.length === 0) {
      return;
    }

    const somaNotas = avaliacoes.reduce((acc, av) => acc + av.nota, 0);
    const media = somaNotas / avaliacoes.length;

    await prisma.estabelecimento.update({
      where: { id: estabelecimentoId },
      data: {
        avaliacao: parseFloat(media.toFixed(2)),
        avaliacoesCount: avaliacoes.length,
      },
    });
  }

  /**
   * Busca avaliação de um pedido
   */
  static async buscarAvaliacaoPorPedido(pedidoId: number) {
    return await prisma.avaliacao.findUnique({
      where: { pedidoId },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
          },
        },
        estabelecimento: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });
  }

  /**
   * Lista avaliações de um estabelecimento
   */
  static async listarAvaliacoesEstabelecimento(
    estabelecimentoId: number,
    limit: number = 10,
    offset: number = 0
  ) {
    try {
      // Usar query raw SQL para evitar erro com avaliações que têm pedidoId null
      // Isso pode acontecer se houver avaliações antigas criadas antes de pedidoId ser obrigatório
      const avaliacoesRaw = await prisma.$queryRaw<any[]>`
        SELECT 
          a.*,
          json_build_object('id', u.id, 'nome', u.nome) as usuario
        FROM "Avaliacao" a
        INNER JOIN "Usuario" u ON a."usuarioId" = u.id
        WHERE a."estabelecimentoId" = ${estabelecimentoId}
        AND a."pedidoId" IS NOT NULL
        ORDER BY a."createdAt" DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const totalRaw = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM "Avaliacao"
        WHERE "estabelecimentoId" = ${estabelecimentoId}
        AND "pedidoId" IS NOT NULL
      `;

      // Transformar os resultados para o formato esperado
      const avaliacoes = avaliacoesRaw.map((av: any) => ({
        id: Number(av.id),
        pedidoId: Number(av.pedidoId),
        estabelecimentoId: Number(av.estabelecimentoId),
        usuarioId: Number(av.usuarioId),
        nota: Number(av.nota),
        notaEntregador: av.notaEntregador ? Number(av.notaEntregador) : null,
        comentario: av.comentario,
        motivos: Array.isArray(av.motivos) ? av.motivos : [],
        createdAt: av.createdAt,
        usuario: typeof av.usuario === 'string' ? JSON.parse(av.usuario) : av.usuario,
      }));

      const total = Number(totalRaw[0]?.count || 0);

      return {
        avaliacoes,
        total,
        limit,
        offset,
      };
    } catch (error) {
      console.error('Erro ao listar avaliações do estabelecimento:', error);
      throw error;
    }
  }

  /**
   * Busca pedidos entregues que podem ser avaliados pelo usuário
   */
  static async buscarPedidosParaAvaliar(usuarioId: number) {
    const pedidos = await prisma.pedido.findMany({
      where: {
        clienteId: usuarioId,
        status: 'entregue',
        avaliacao: null, // Ainda não foi avaliado
        entregueEm: {
          not: null,
        },
      },
      include: {
        estabelecimento: {
          select: {
            id: true,
            nome: true,
            imagem: true,
          },
        },
      },
      orderBy: {
        entregueEm: 'desc',
      },
      take: 10,
    });

    // Filtrar apenas os que estão dentro da janela de 30 minutos
    const pedidosParaAvaliar = [];
    for (const pedido of pedidos) {
      if (pedido.entregueEm) {
        const entregueEm = new Date(pedido.entregueEm);
        const agora = new Date();
        const diffMinutes = (agora.getTime() - entregueEm.getTime()) / (1000 * 60);
        
        if (diffMinutes <= 30) {
          pedidosParaAvaliar.push(pedido);
        }
      }
    }

    return pedidosParaAvaliar;
  }

  /**
   * Lista avaliações feitas por um usuário
   */
  static async listarAvaliacoesUsuario(
    usuarioId: number,
    limit: number = 20,
    offset: number = 0
  ) {
    try {
      // Usar query raw SQL para evitar erro com avaliações que têm pedidoId null
      const avaliacoesRaw = await prisma.$queryRaw<any[]>`
        SELECT 
          a.*,
          json_build_object('id', e.id, 'nome', e.nome, 'imagem', e.imagem) as estabelecimento,
          json_build_object('id', p.id, 'status', p.status, 'createdAt', p."createdAt") as pedido
        FROM "Avaliacao" a
        INNER JOIN "Estabelecimento" e ON a."estabelecimentoId" = e.id
        LEFT JOIN "Pedido" p ON a."pedidoId" = p.id
        WHERE a."usuarioId" = ${usuarioId}
        AND a."pedidoId" IS NOT NULL
        ORDER BY a."createdAt" DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const totalRaw = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM "Avaliacao"
        WHERE "usuarioId" = ${usuarioId}
        AND "pedidoId" IS NOT NULL
      `;

      // Transformar os resultados para o formato esperado
      const avaliacoes = avaliacoesRaw.map((av: any) => ({
        id: Number(av.id),
        pedidoId: Number(av.pedidoId),
        estabelecimentoId: Number(av.estabelecimentoId),
        usuarioId: Number(av.usuarioId),
        nota: Number(av.nota),
        notaEntregador: av.notaEntregador ? Number(av.notaEntregador) : null,
        comentario: av.comentario,
        motivos: Array.isArray(av.motivos) ? av.motivos : [],
        createdAt: av.createdAt,
        estabelecimento: typeof av.estabelecimento === 'string' ? JSON.parse(av.estabelecimento) : av.estabelecimento,
        pedido: typeof av.pedido === 'string' ? JSON.parse(av.pedido) : av.pedido,
      }));

      const total = Number(totalRaw[0]?.count || 0);

      return {
        avaliacoes,
        total,
        limit,
        offset,
      };
    } catch (error) {
      console.error('Erro ao listar avaliações do usuário:', error);
      throw error;
    }
  }
}


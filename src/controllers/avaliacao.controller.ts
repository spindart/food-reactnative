import { Request, Response } from 'express';
import { AvaliacaoService, MOTIVOS_POSITIVOS, MOTIVOS_NEGATIVOS } from '../services/avaliacao.service';

export class AvaliacaoController {
  /**
   * POST /api/avaliacoes
   * Cria uma nova avaliação
   */
  static async criar(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = (req as any).user?.id; // Obtido do middleware de autenticação
      if (!usuarioId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }
      const { pedidoId, nota, notaEntregador, comentario, motivos } = req.body;

      if (!pedidoId || !nota) {
        res.status(400).json({ error: 'pedidoId e nota são obrigatórios' });
        return;
      }

      const avaliacao = await AvaliacaoService.criarAvaliacao({
        pedidoId: Number(pedidoId),
        usuarioId,
        nota: Number(nota),
        notaEntregador: notaEntregador ? Number(notaEntregador) : undefined,
        comentario,
        motivos: Array.isArray(motivos) ? motivos : [],
      });

      res.status(201).json({
        success: true,
        message: 'Avaliação criada com sucesso',
        avaliacao,
      });
    } catch (error: any) {
      console.error('Erro ao criar avaliação:', error);
      res.status(400).json({
        error: 'Erro ao criar avaliação',
        details: error.message,
      });
    }
  }

  /**
   * GET /api/avaliacoes/pedido/:pedidoId
   * Busca avaliação de um pedido específico
   */
  static async buscarPorPedido(req: Request, res: Response): Promise<void> {
    try {
      const { pedidoId } = req.params;
      const avaliacao = await AvaliacaoService.buscarAvaliacaoPorPedido(Number(pedidoId));

      if (!avaliacao) {
        res.status(404).json({ error: 'Avaliação não encontrada' });
        return;
      }

      res.json(avaliacao);
    } catch (error: any) {
      console.error('Erro ao buscar avaliação:', error);
      res.status(500).json({
        error: 'Erro ao buscar avaliação',
        details: error.message,
      });
    }
  }

  /**
   * GET /api/avaliacoes/estabelecimento/:estabelecimentoId
   * Lista avaliações de um estabelecimento
   */
  static async listarPorEstabelecimento(req: Request, res: Response): Promise<void> {
    try {
      const { estabelecimentoId } = req.params;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const offset = req.query.offset ? Number(req.query.offset) : 0;

      const resultado = await AvaliacaoService.listarAvaliacoesEstabelecimento(
        Number(estabelecimentoId),
        limit,
        offset
      );

      res.json(resultado);
    } catch (error: any) {
      console.error('Erro ao listar avaliações:', error);
      res.status(500).json({
        error: 'Erro ao listar avaliações',
        details: error.message,
      });
    }
  }

  /**
   * GET /api/avaliacoes/para-avaliar
   * Lista pedidos que podem ser avaliados pelo usuário atual
   */
  static async listarParaAvaliar(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = (req as any).user?.id;
      if (!usuarioId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }
      const pedidos = await AvaliacaoService.buscarPedidosParaAvaliar(usuarioId);

      res.json({
        pedidos,
        total: pedidos.length,
      });
    } catch (error: any) {
      console.error('Erro ao buscar pedidos para avaliar:', error);
      res.status(500).json({
        error: 'Erro ao buscar pedidos para avaliar',
        details: error.message,
      });
    }
  }

  /**
   * GET /api/avaliacoes/pode-avaliar/:pedidoId
   * Verifica se o usuário pode avaliar um pedido
   */
  static async podeAvaliar(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = (req as any).user?.id;
      if (!usuarioId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }
      const { pedidoId } = req.params;

      const resultado = await AvaliacaoService.canAvaliar(Number(pedidoId), usuarioId);
      const isWithinWindow = await AvaliacaoService.isWithinEvaluationWindow(Number(pedidoId));

      res.json({
        ...resultado,
        isWithinWindow,
      });
    } catch (error: any) {
      console.error('Erro ao verificar se pode avaliar:', error);
      res.status(500).json({
        error: 'Erro ao verificar se pode avaliar',
        details: error.message,
      });
    }
  }

  /**
   * GET /api/avaliacoes/motivos
   * Retorna os motivos pré-definidos para avaliação
   */
  static async listarMotivos(req: Request, res: Response): Promise<void> {
    res.json({
      positivos: MOTIVOS_POSITIVOS,
      negativos: MOTIVOS_NEGATIVOS,
    });
  }

  /**
   * GET /api/avaliacoes/minhas
   * Lista avaliações feitas pelo usuário atual
   */
  static async listarMinhasAvaliacoes(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = (req as any).user?.id;
      if (!usuarioId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }

      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const offset = req.query.offset ? Number(req.query.offset) : 0;

      const resultado = await AvaliacaoService.listarAvaliacoesUsuario(
        usuarioId,
        limit,
        offset
      );

      res.json(resultado);
    } catch (error: any) {
      console.error('Erro ao listar avaliações do usuário:', error);
      res.status(500).json({
        error: 'Erro ao listar avaliações',
        details: error.message,
      });
    }
  }
}

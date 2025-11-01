import api from './api';

export interface CriarAvaliacaoData {
  pedidoId: number;
  nota: number; // 1 a 5
  notaEntregador?: number; // 1 a 5 (opcional)
  comentario?: string;
  motivos?: string[];
}

export interface Avaliacao {
  id: number;
  pedidoId: number;
  estabelecimentoId: number;
  usuarioId: number;
  nota: number;
  notaEntregador?: number;
  comentario?: string;
  motivos: string[];
  createdAt: string;
  estabelecimento?: {
    id: number;
    nome: string;
    imagem?: string;
  };
  pedido?: {
    id: number;
    status: string;
    createdAt: string;
  };
  usuario?: {
    id: number;
    nome: string;
  };
}

export interface MotivosResponse {
  positivos: string[];
  negativos: string[];
}

export const avaliacaoService = {
  /**
   * Criar uma nova avaliação
   */
  async criar(data: CriarAvaliacaoData): Promise<Avaliacao> {
    const response = await api.post('/avaliacoes', data);
    return response.data.avaliacao;
  },

  /**
   * Buscar avaliação de um pedido
   */
  async buscarPorPedido(pedidoId: number): Promise<Avaliacao | null> {
    try {
      const response = await api.get(`/avaliacoes/pedido/${pedidoId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Listar avaliações de um estabelecimento
   */
  async listarPorEstabelecimento(
    estabelecimentoId: number,
    limit: number = 10,
    offset: number = 0
  ) {
    try {
      const response = await api.get(
        `/avaliacoes/estabelecimento/${estabelecimentoId}?limit=${limit}&offset=${offset}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Erro na requisição de avaliações:', {
        url: `/avaliacoes/estabelecimento/${estabelecimentoId}`,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      throw error;
    }
  },

  /**
   * Listar pedidos que podem ser avaliados
   */
  async listarParaAvaliar() {
    const response = await api.get('/avaliacoes/para-avaliar');
    return response.data;
  },

  /**
   * Verificar se pode avaliar um pedido
   */
  async podeAvaliar(pedidoId: number) {
    const response = await api.get(`/avaliacoes/pode-avaliar/${pedidoId}`);
    return response.data;
  },

  /**
   * Listar motivos pré-definidos
   */
  async listarMotivos(): Promise<MotivosResponse> {
    const response = await api.get('/avaliacoes/motivos');
    return response.data;
  },

  /**
   * Listar avaliações do usuário atual
   */
  async listarMinhasAvaliacoes(limit: number = 20, offset: number = 0) {
    const response = await api.get(
      `/avaliacoes/minhas?limit=${limit}&offset=${offset}`
    );
    return response.data;
  },
};


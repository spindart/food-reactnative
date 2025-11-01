import api from './api';

export interface Notificacao {
  id: number;
  usuarioId: number;
  tipo: 'STATUS_PEDIDO' | 'MENSAGEM_RESTAURANTE' | 'PROMOCAO_CUPOM' | 'AVISO_IMPORTANTE' | 'EVENTO_SISTEMA';
  titulo: string;
  mensagem: string;
  lida: boolean;
  lidaEm?: string;
  createdAt: string;
  pedidoId?: number;
  pedido?: {
    id: number;
    status: string;
    estabelecimento?: {
      id: number;
      nome: string;
      imagem?: string;
    };
  };
}

export class NotificacaoService {
  /**
   * Lista notificações do usuário
   */
  static async listar(apenasNaoLidas?: boolean): Promise<Notificacao[]> {
    const params = apenasNaoLidas ? { apenasNaoLidas: 'true' } : {};
    const response = await api.get('/notificacoes', { params });
    return response.data;
  }

  /**
   * Conta notificações não lidas
   */
  static async contarNaoLidas(): Promise<number> {
    const response = await api.get('/notificacoes/nao-lidas');
    return response.data.count;
  }

  /**
   * Marca notificação como lida
   */
  static async marcarComoLida(notificacaoId: number): Promise<void> {
    await api.post(`/notificacoes/${notificacaoId}/marcar-lida`);
  }

  /**
   * Marca todas como lidas
   */
  static async marcarTodasComoLidas(): Promise<void> {
    await api.post('/notificacoes/marcar-todas-lidas');
  }

  /**
   * Deleta notificação
   */
  static async deletar(notificacaoId: number): Promise<void> {
    await api.delete(`/notificacoes/${notificacaoId}`);
  }
}


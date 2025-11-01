import api from './api';
import { ImagePickerAsset } from 'expo-image-picker';

export interface Mensagem {
  id: number;
  conversaId: number;
  remetenteId: number;
  remetente: {
    id: number;
    nome: string;
    role: string;
  };
  texto?: string;
  imagemUrl?: string;
  status: 'enviado' | 'recebido' | 'lido';
  isFromEstabelecimento: boolean;
  createdAt: string;
  lidaEm?: string;
}

export interface Conversa {
  id: number;
  pedidoId: number;
  mensagens: Mensagem[];
  pedido: {
    id: number;
    status: string;
    estabelecimento: {
      id: number;
      nome: string;
      imagem?: string;
    };
    cliente?: {
      id: number;
      nome: string;
    };
  };
  canSend?: boolean;
  reason?: string;
  unreadCount?: number;
}

export class ChatService {
  /**
   * Obtém conversa de um pedido
   */
  static async getConversa(pedidoId: number): Promise<Conversa> {
    const response = await api.get(`/chat/pedido/${pedidoId}`);
    return response.data;
  }

  /**
   * Envia mensagem de texto
   */
  static async sendMensagemTexto(pedidoId: number, texto: string): Promise<Mensagem> {
    const response = await api.post(`/chat/pedido/${pedidoId}/mensagem`, {
      texto,
    });
    return response.data;
  }

  /**
   * Envia mensagem com imagem
   */
  static async sendMensagemImagem(pedidoId: number, imagemUri: string): Promise<Mensagem> {
    // Para React Native, usando expo-file-system para converter
    try {
      const FileSystem = await import('expo-file-system');
      
      // Converte imagem para base64
      const base64data = await FileSystem.default.readAsStringAsync(imagemUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const base64Uri = `data:image/jpeg;base64,${base64data}`;
      
      const apiResponse = await api.post(`/chat/pedido/${pedidoId}/mensagem`, {
        imagemUrl: base64Uri,
      });
      return apiResponse.data;
    } catch (error) {
      console.error('Erro ao converter imagem:', error);
      throw error;
    }
  }

  /**
   * Marca mensagens como lidas
   */
  static async marcarLido(pedidoId: number): Promise<void> {
    await api.post(`/chat/pedido/${pedidoId}/marcar-lido`);
  }

  /**
   * Lista conversas do usuário
   */
  static async listConversas(): Promise<Conversa[]> {
    const response = await api.get('/chat/conversas');
    return response.data;
  }

  /**
   * Obtém templates de mensagens rápidas
   */
  static async getTemplates(): Promise<{ id: number; texto: string }[]> {
    const response = await api.get('/chat/templates');
    return response.data;
  }
}


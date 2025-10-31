import api from './api';
import type { Categoria } from './categoriaService';

export type Estabelecimento = {
  id?: string;
  nome: string;
  descricao: string;
  endereco: string;
  latitude?: number | null;
  longitude?: number | null;
  tempoEntregaMin?: number;
  tempoEntregaMax?: number;
  taxaEntrega?: number;
  categorias?: Categoria[];
  imagem?: string;
  // Dias da semana que abre (0 = Dom, 6 = Sáb)
  diasAbertos?: number[];
  // Horários gerais (HH:mm)
  horaAbertura?: string;
  horaFechamento?: string;
  // Flag manual (controlada pelo dono)
  aberto?: boolean;
  // Configuração de frete grátis
  freteGratisAtivado?: boolean;
  valorMinimoFreteGratis?: number;
};

export const getAllEstabelecimentos = async () => {
  try {
    const response = await api.get('/estabelecimentos');
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar estabelecimentos:', error);
    throw error;
  }
};

export const getEstabelecimentoById = async (id: string) => {
  try {
    const response = await api.get(`/estabelecimentos/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar estabelecimento:', error);
    throw error;
  }
};

export const createEstabelecimento = async (data: Estabelecimento) => {
  try {
    const response = await api.post('/estabelecimentos', data);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar estabelecimento:', error);
    throw error;
  }
};

export const updateEstabelecimento = async (id: string, data: Estabelecimento | any) => {
  try {
    console.log('📡 Serviço: Enviando dados para atualização:', {
      id,
      freteGratisAtivado: data.freteGratisAtivado,
      valorMinimoFreteGratis: data.valorMinimoFreteGratis,
      categorias: data.categorias
    });
    const response = await api.put(`/estabelecimentos/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Erro ao atualizar estabelecimento:', error);
    throw error;
  }
};

export const setAbertoEstabelecimento = async (id: string, aberto: boolean) => {
  try {
    const response = await api.patch(`/estabelecimentos/${id}/aberto`, { aberto });
    return response.data;
  } catch (error) {
    console.error('Erro ao alternar disponibilidade:', error);
    throw error;
  }
};

export const deleteEstabelecimento = async (id: string) => {
  try {
    const response = await api.delete(`/estabelecimentos/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao deletar estabelecimento:', error);
    throw error;
  }
};

export const getMeusEstabelecimentos = async () => {
  try {
    const response = await api.get('/estabelecimentos/meus');
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar estabelecimentos do dono:', error);
    throw error;
  }
};

export const getAvaliacoes = async (estabelecimentoId: string) => {
  try {
    const response = await api.get(`/estabelecimentos/${estabelecimentoId}/avaliacoes`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar avaliações:', error);
    throw error;
  }
};

export const avaliarEstabelecimento = async (estabelecimentoId: string, avaliacao: { nota: number; comentario: string }) => {
  try {
    const response = await api.post(`/estabelecimentos/avaliar`, {
      estabelecimentoId,
      ...avaliacao,
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao enviar avaliação:', error);
    throw error;
  }
};

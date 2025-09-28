import api from './api';

// Corrige o tipo Produto para aceitar estabelecimentoId opcional
export type Produto = {
  id?: string;
  nome: string;
  preco: number;
  descricao: string;
  imagem: string;
  estabelecimentoId?: string | number;
  categoriaId?: string;
};

export const getAllProdutos = async () => {
  try {
    const response = await api.get('/produtos');
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    throw error;
  }
};

export const getProdutoById = async (id: string) => {
  try {
    const response = await api.get(`/produtos/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    throw error;
  }
};

export const createProduto = async (data: Produto) => {
  try {
    const response = await api.post('/produtos', data);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    throw error;
  }
};

export const updateProduto = async (id: string, data: Produto) => {
  try {
    const response = await api.put(`/produtos/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    throw error;
  }
};

export const deleteProduto = async (id: string) => {
  try {
    const response = await api.delete(`/produtos/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    throw error;
  }
};

export const getProdutoByEstabelecimento = async (estabelecimentoId: string) => {
  try {
    const response = await api.get(`/produtos?estabelecimentoId=${estabelecimentoId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar produtos do estabelecimento:', error);
    throw error;
  }
};

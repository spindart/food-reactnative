import api from './api';

export type ProdutoCategoria = {
  id: number;
  estabelecimentoId: number;
  nome: string;
  slug?: string | null;
  ordem?: number | null;
  ativa: boolean;
};

export const listProdutoCategorias = async (estabelecimentoId: number): Promise<ProdutoCategoria[]> => {
  const { data } = await api.get(`/produto-categorias/estabelecimento/${estabelecimentoId}`);
  return data;
};

export const createProdutoCategoria = async (estabelecimentoId: number, payload: Partial<ProdutoCategoria>) => {
  const { data } = await api.post(`/produto-categorias/estabelecimento/${estabelecimentoId}`, payload);
  return data;
};

export const updateProdutoCategoria = async (estabelecimentoId: number, id: number, payload: Partial<ProdutoCategoria>) => {
  const { data } = await api.put(`/produto-categorias/estabelecimento/${estabelecimentoId}/${id}`, payload);
  return data;
};

export const deleteProdutoCategoria = async (estabelecimentoId: number, id: number) => {
  const { data } = await api.delete(`/produto-categorias/estabelecimento/${estabelecimentoId}/${id}`);
  return data;
};



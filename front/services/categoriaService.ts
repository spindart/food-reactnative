import api from './api';

export type Categoria = {
  id: string;
  nome: string;
};

export const getCategorias = async (): Promise<Categoria[]> => {
  const response = await api.get('/categorias');
  return response.data;
};

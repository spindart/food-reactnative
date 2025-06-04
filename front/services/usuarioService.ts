import api from './api';

export const getUsuarioById = async (id: string) => {
  const response = await api.get(`/usuarios/${id}`);
  return response.data;
};

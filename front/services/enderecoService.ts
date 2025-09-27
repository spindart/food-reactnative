import api from './api';

export const getEnderecos = async () => {
  const response = await api.get('/enderecos');
  return response.data;
};

export const addEndereco = async (data) => {
  const response = await api.post('/enderecos', data);
  return response.data;
};

export const updateEndereco = async (id, data) => {
  const response = await api.put(`/enderecos/${id}`, data);
  return response.data;
};

export const deleteEndereco = async (id) => {
  const response = await api.delete(`/enderecos/${id}`);
  return response.data;
};

export const setEnderecoPadrao = async (id) => {
  const response = await api.post(`/enderecos/${id}/padrao`);
  return response.data;
};

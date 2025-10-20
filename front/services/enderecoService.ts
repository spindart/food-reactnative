import api from './api';

export const getEnderecos = async () => {
  try {
    console.log('Buscando endereços...');
    const response = await api.get('/enderecos');
    console.log('Endereços encontrados:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar endereços:', error);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      throw new Error(error.response.data.error || 'Erro ao buscar endereços');
    } else if (error.request) {
      console.error('Request:', error.request);
      throw new Error('Erro de conexão. Verifique sua internet.');
    } else {
      console.error('Error:', error.message);
      throw new Error('Erro inesperado');
    }
  }
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
  try {
    console.log('Chamando API para definir endereço padrão:', id);
    const response = await api.post(`/enderecos/${Number(id)}/padrao`);
    console.log('Resposta da API:', response.data);
    
    // Verificar se a resposta é válida
    if (response.data && response.data.id) {
      return response.data;
    } else {
      console.error('Resposta inválida da API:', response.data);
      throw new Error('Resposta inválida do servidor');
    }
  } catch (error) {
    console.error('Erro na API setEnderecoPadrao:', error);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      const errorMessage = error.response.data?.error || error.response.data?.message || 'Erro ao definir endereço padrão';
      throw new Error(errorMessage);
    } else if (error.request) {
      console.error('Request:', error.request);
      throw new Error('Erro de conexão. Verifique sua internet.');
    } else {
      console.error('Error:', error.message);
      throw new Error(error.message || 'Erro inesperado');
    }
  }
};

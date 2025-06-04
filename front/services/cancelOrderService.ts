import api from './api';

export const cancelOrder = async (pedidoId: string) => {
  const response = await api.delete(`/pedidos/${pedidoId}`);
  return response.data;
};

import api from './api';

export const cancelOrder = async (pedidoId: string, reason?: string) => {
  console.log('🔄 Frontend: Iniciando cancelamento do pedido:', pedidoId, 'Motivo:', reason);
  
  try {
    const response = await api.post(`/pedidos/${pedidoId}/cancel`, { reason });
    console.log('✅ Frontend: Resposta do cancelamento:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Frontend: Erro no cancelamento:', error);
    console.error('❌ Frontend: Status:', error.response?.status);
    console.error('❌ Frontend: Data:', error.response?.data);
    throw error;
  }
};

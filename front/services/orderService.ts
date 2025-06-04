import api from './api';

type OrderItem = {
  produtoId: string;
  quantidade: number;
  precoUnitario: number;
};

type CreateOrderPayload = {
  clienteId: string;
  estabelecimentoId: string;
  itens: OrderItem[];
};

export const createOrder = async (payload: CreateOrderPayload) => {
  try {
    const response = await api.post('/pedidos', payload);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    throw error;
  }
};

export const updateOrderStatus = async (pedidoId: string) => {
  try {
    const response = await api.patch(`/pedidos/${pedidoId}/status`);
    return response.data;
  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    throw error;
  }
};

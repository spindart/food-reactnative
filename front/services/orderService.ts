import api from './api';

// Novo payload para o endpoint /orders/confirm
type ProdutoPayload = {
  produtoId: number;
  quantidade: number;
  observacao?: string;
};
type CreateOrderPayload = {
  clienteId: number;
  estabelecimentoId: number;
  produtos: ProdutoPayload[];
  formaPagamento: string;
  total: number;
  // Informações de pagamento (opcionais)
  paymentId?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  // Informações de pagamento na entrega (opcionais)
  formaPagamentoEntrega?: string;
  precisaTroco?: boolean;
  trocoParaQuanto?: number;
  // Endereço de entrega (opcional)
  enderecoEntrega?: string;
};

export const createOrder = async (payload: CreateOrderPayload) => {
  try {
    const response = await api.post('/pedidos/confirm', payload);
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

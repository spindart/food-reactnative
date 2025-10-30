import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { getUsuarioById } from '../services/usuarioService';
import { updateOrderStatus } from '../services/orderService';
import { getProdutoById } from '../services/produtoService';
import { cancelOrder } from '../services/cancelOrderService';

interface PedidoItem {
  id: string;
  produtoId: string;
  quantidade: number;
  precoUnitario: number;
  observacao?: string | null;
}

interface Pedido {
  id: string;
  clienteId: string;
  estabelecimentoId: string;
  status: string;
  createdAt: string;
  itens: PedidoItem[];
  // Campos de pagamento
  paymentId?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  totalAmount?: number;
  // Campos de pagamento na entrega
  formaPagamentoEntrega?: string;
  precisaTroco?: boolean;
  trocoParaQuanto?: number;
  // Campo de endereço de entrega
  enderecoEntrega?: string;
}

interface ClienteInfo {
  id: string;
  nome: string;
  email: string;
  role: string;
}

const PedidosDoEstabelecimentoScreen: React.FC = () => {
  const route = useRoute<any>();
  const { estabelecimento } = route.params;
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clientes, setClientes] = useState<{ [id: string]: ClienteInfo }>({});
  const [produtos, setProdutos] = useState<{ [id: string]: { nome: string } }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pedidos' | 'historico'>('pedidos');
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string; type: string }>({
    visible: false,
    message: '',
    type: '',
  });
  
  // Estados para atualização automática
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [isAutoUpdating, setIsAutoUpdating] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Função para buscar pedidos com ordenação decrescente por ID
  const fetchPedidos = useCallback(async (isAutoUpdate = false) => {
    if (isAutoUpdate) {
      setIsAutoUpdating(true);
    }
    
    try {
      const response = await api.get(`/pedidos/estabelecimento/${estabelecimento.id}`);
      
      // Ordenar pedidos por ID decrescente (mais recentes primeiro)
      const pedidosOrdenados = response.data.sort((a: Pedido, b: Pedido) => {
        return parseInt(b.id) - parseInt(a.id);
      });
      
      setPedidos(pedidosOrdenados);
      
      // Buscar dados dos clientes apenas se não for atualização automática
      if (!isAutoUpdate) {
        const uniqueClienteIds = Array.from(new Set(response.data.map((p: Pedido) => p.clienteId)));
        const clientesObj: { [id: string]: ClienteInfo } = {};
        await Promise.all(
          uniqueClienteIds.map(async (cidRaw) => {
            const cid = String(cidRaw);
            try {
              const user = await getUsuarioById(cid);
              clientesObj[cid] = user;
            } catch {}
          }),
        );
        setClientes(clientesObj);
        
        // Buscar nomes dos produtos apenas se não for atualização automática
        const uniqueProdutoIds = Array.from(new Set(response.data.flatMap((p: Pedido) => p.itens.map((it) => it.produtoId))));
        const produtosObj: { [id: string]: { nome: string } } = {};
        await Promise.all(
          uniqueProdutoIds.map(async (pidRaw) => {
            const pid = String(pidRaw);
            try {
              const produto = await getProdutoById(pid);
              produtosObj[pid] = { nome: produto.nome };
            } catch {}
          })
        );
        setProdutos(produtosObj);
      }
      
      setLastUpdateTime(Date.now());
    } catch (err) {
      if (!isAutoUpdate) {
        setError('Erro ao carregar pedidos.');
      }
    } finally {
      if (isAutoUpdate) {
        setIsAutoUpdating(false);
      } else {
        setLoading(false);
      }
    }
  }, [estabelecimento.id]);

  // Função para iniciar atualização automática
  const startAutoUpdate = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Atualizar a cada 30 segundos quando a tela estiver em foco
    intervalRef.current = setInterval(() => {
      fetchPedidos(true);
    }, 30000);
  }, [fetchPedidos]);

  // Função para parar atualização automática
  const stopAutoUpdate = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // useEffect inicial
  useEffect(() => {
    fetchPedidos();
    
    // Cleanup ao desmontar
    return () => {
      stopAutoUpdate();
    };
  }, [fetchPedidos, stopAutoUpdate]);

  // useFocusEffect para atualização automática quando a tela ganha foco
  useFocusEffect(
    useCallback(() => {
      // Atualizar imediatamente quando a tela ganha foco
      fetchPedidos(true);
      
      // Iniciar atualização automática
      startAutoUpdate();
      
      // Cleanup quando a tela perde foco
      return () => {
        stopAutoUpdate();
      };
    }, [fetchPedidos, startAutoUpdate, stopAutoUpdate])
  );

  const handleUpdateStatus = async (pedidoId: string) => {
    setStatusLoading(pedidoId);
    try {
      const updated = await updateOrderStatus(pedidoId);
      setPedidos((prev) => prev.map((p) => (p.id === pedidoId ? { ...p, status: updated.status } : p)));
      setSnackbar({ visible: true, message: 'Status atualizado!', type: 'success' });
    } catch {
      setSnackbar({ visible: true, message: 'Erro ao atualizar status.', type: 'error' });
    } finally {
      setStatusLoading(null);
    }
  };

  const handleCancelOrder = async (pedidoId: string) => {
    console.log('🔄 PedidosDoEstabelecimentoScreen: Iniciando cancelamento do pedido:', pedidoId);
    setCancelLoading(pedidoId);
    try {
      console.log('🔄 PedidosDoEstabelecimentoScreen: Chamando cancelOrder...');
      const result = await cancelOrder(pedidoId, 'Cancelado pelo estabelecimento');
      console.log('✅ PedidosDoEstabelecimentoScreen: Resultado do cancelamento:', result);
      
      // Atualizar o pedido na lista em vez de removê-lo
      setPedidos((prev) => 
        prev.map((p) => 
          p.id === pedidoId 
            ? { ...p, status: 'cancelado' } 
            : p
        )
      );
      
      setSnackbar({ 
        visible: true, 
        message: result.refund ? 
          `Pedido cancelado! Reembolso de R$ ${result.refund.amount} processado.` : 
          'Pedido cancelado!', 
        type: 'success' 
      });
    } catch (error: any) {
      console.error('❌ PedidosDoEstabelecimentoScreen: Erro detalhado ao cancelar pedido:', error);
      console.error('❌ PedidosDoEstabelecimentoScreen: Status:', error.response?.status);
      console.error('❌ PedidosDoEstabelecimentoScreen: Data:', error.response?.data);
      console.error('❌ PedidosDoEstabelecimentoScreen: Message:', error.message);
      console.error('❌ PedidosDoEstabelecimentoScreen: Stack:', error.stack);
      
      setSnackbar({ 
        visible: true, 
        message: `Erro ao cancelar pedido: ${error.response?.data?.message || error.message}`, 
        type: 'error' 
      });
    } finally {
      setCancelLoading(null);
    }
  };

  // Função para renderizar informações de pagamento
  const renderPaymentInfo = (pedido: Pedido) => {
    // Se tem formaPagamentoEntrega, é pagamento na entrega
    if (pedido.formaPagamentoEntrega) {
      return (
        <View style={styles.paymentInfoContainer}>
          <Text style={styles.paymentTitle}>💳 Pagamento na Entrega</Text>
          <View style={styles.paymentDetails}>
            <Text style={styles.paymentMethod}>
              {pedido.formaPagamentoEntrega === 'dinheiro' ? '💵 Dinheiro' : 
               pedido.formaPagamentoEntrega === 'debito' ? '💳 Cartão de Débito' : 
               '💳 Cartão de Crédito'}
            </Text>
            
            {pedido.formaPagamentoEntrega === 'dinheiro' && (
              <View style={styles.trocoInfo}>
                <Text style={styles.trocoLabel}>Troco:</Text>
                <Text style={styles.trocoValue}>
                  {pedido.precisaTroco ? 
                    `Sim, para R$ ${pedido.trocoParaQuanto?.toFixed(2)}` : 
                    'Não precisa'
                  }
                </Text>
              </View>
            )}
          </View>
        </View>
      );
    }
    
    // Se tem paymentMethod, é pagamento online
    if (pedido.paymentMethod) {
      return (
        <View style={styles.paymentInfoContainer}>
          <Text style={styles.paymentTitle}>💳 Pagamento Online</Text>
          <View style={styles.paymentDetails}>
            <Text style={styles.paymentMethod}>
              {pedido.paymentMethod === 'pix' ? '📱 PIX' : 
               pedido.paymentMethod === 'credit_card' ? '💳 Cartão de Crédito' : 
               '💳 Cartão'}
            </Text>
            <Text style={styles.paymentStatus}>
              Status: {pedido.paymentStatus === 'approved' ? '✅ Aprovado' : 
                      pedido.paymentStatus === 'pending' ? '⏳ Pendente' : 
                      pedido.paymentStatus || '❓ Desconhecido'}
            </Text>
            {pedido.totalAmount && (
              <Text style={styles.paymentAmount}>
                Valor: R$ {pedido.totalAmount.toFixed(2)}
              </Text>
            )}
          </View>
        </View>
      );
    }
    
    // Se não tem informações de pagamento
    return (
      <View style={styles.paymentInfoContainer}>
        <Text style={styles.paymentTitle}>❓ Forma de Pagamento</Text>
        <Text style={styles.paymentMethod}>Não informada</Text>
      </View>
    );
  };

  // Funções auxiliares para status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return '#FF6B35';
      case 'preparo': return '#FFA726';
      case 'entregue': return '#4CAF50';
      case 'cancelado': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'preparo': return 'Em Preparo';
      case 'entregue': return 'Entregue';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // Filtrar por aba
  const pedidosFiltrados = pedidos.filter((p) =>
    activeTab === 'pedidos'
      ? (p.status === 'pendente' || p.status === 'preparo')
      : (p.status === 'entregue' || p.status === 'cancelado')
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pedidos de {estabelecimento.nome}</Text>
        {isAutoUpdating && (
          <View style={styles.autoUpdateIndicator}>
            <ActivityIndicator size="small" color="#e5293e" />
            <Text style={styles.autoUpdateText}>Atualizando...</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'pedidos' ? styles.tabButtonActive : undefined,
          ]}
          onPress={() => setActiveTab('pedidos')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'pedidos' ? styles.tabTextActive : undefined]}>Pedidos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'historico' ? styles.tabButtonActive : undefined,
          ]}
          onPress={() => setActiveTab('historico')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'historico' ? styles.tabTextActive : undefined]}>Histórico</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={pedidosFiltrados}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {/* Header do pedido */}
            <View style={styles.cardHeader}>
              <Text style={styles.orderId}>Pedido #{item.id}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
              </View>
            </View>
            
            {/* Informações básicas */}
            <View style={styles.orderInfo}>
              <Text style={styles.orderDate}>📅 {new Date(item.createdAt).toLocaleString()}</Text>
              <Text style={styles.customerName}>👤 {clientes[item.clienteId]?.nome || 'Cliente'}</Text>
            </View>
            
            {/* Informações de pagamento */}
            {renderPaymentInfo(item)}
            
            {/* Endereço de entrega */}
            {item.enderecoEntrega && (
              <View style={styles.addressContainer}>
                <Text style={styles.addressTitle}>📍 Endereço de Entrega</Text>
                <Text style={styles.addressText}>{item.enderecoEntrega}</Text>
              </View>
            )}
            
            {/* Itens do pedido */}
            <View style={styles.itemsContainer}>
              <Text style={styles.itemsTitle}>🛒 Itens do Pedido</Text>
              {item.itens.map((it) => (
                <View key={it.id} style={styles.itemRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.itemName}>{produtos[it.produtoId]?.nome || it.produtoId}</Text>
                    {!!it.observacao && (
                      <Text style={styles.itemObservation}>Obs.: {it.observacao}</Text>
                    )}
                  </View>
                  <Text style={styles.itemDetails}>
                    {it.quantidade}x R$ {it.precoUnitario.toFixed(2)} = R$ {(it.quantidade * it.precoUnitario).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
            
            {/* Total do pedido */}
            {item.totalAmount && (
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalValue}>R$ {item.totalAmount.toFixed(2)}</Text>
              </View>
            )}
            
            {/* Botões de ação */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton, { opacity: statusLoading === item.id ? 0.6 : 1 }]}
                onPress={() => handleUpdateStatus(item.id)}
                disabled={statusLoading === item.id || item.status === 'entregue' || item.status === 'cancelado'}
              >
                <Text style={styles.primaryButtonText}>
                  {statusLoading === item.id
                    ? '⏳ Atualizando...'
                    : item.status === 'pendente'
                    ? '🍳 Avançar para Preparo'
                    : item.status === 'preparo'
                    ? '✅ Marcar como Entregue'
                    : '✅ Finalizado'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.dangerButton, { opacity: cancelLoading === item.id ? 0.6 : 1 }]}
                onPress={() => {
                  console.log('🔄 Botão cancelar pressionado para pedido:', item.id);
                  handleCancelOrder(item.id);
                }}
                disabled={cancelLoading === item.id || item.status === 'entregue' || item.status === 'cancelado'}
              >
                <Text style={styles.dangerButtonText}>
                  {cancelLoading === item.id ? '⏳ Cancelando...' : '❌ Cancelar Pedido'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={pedidosFiltrados.length === 0 ? styles.centered : undefined}
        ListEmptyComponent={<Text>{activeTab === 'pedidos' ? 'Nenhum pedido em andamento.' : 'Sem histórico por enquanto.'}</Text>}
      />
      {snackbar.visible && (
        <View
          style={[
            styles.snackbar,
            { backgroundColor: snackbar.type === 'success' ? '#4BB543' : '#D32F2F' },
          ]}
        >
          <Text style={styles.snackbarText}>{snackbar.message}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5',
    paddingTop: 20,
  },
  
  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginHorizontal: 16,
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#333',
    flex: 1,
  },
  autoUpdateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  autoUpdateText: {
    fontSize: 12,
    color: '#e5293e',
    marginLeft: 6,
    fontWeight: '500',
  },
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  tabButtonActive: {
    backgroundColor: '#e5293e',
  },
  tabText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  
  // Card styles (iFood style)
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 20, 
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  // Header do pedido
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderId: { 
    fontSize: 18, 
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Informações básicas
  orderInfo: {
    marginBottom: 16,
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  
  // Informações de pagamento
  paymentInfoContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e5293e',
    marginBottom: 8,
  },
  paymentDetails: {
    marginLeft: 8,
  },
  paymentMethod: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  paymentStatus: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e5293e',
  },
  trocoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  trocoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  trocoValue: {
    fontSize: 14,
    color: '#666',
  },
  
  // Endereço de entrega
  addressContainer: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
  },
  
  // Itens do pedido
  itemsContainer: {
    marginBottom: 16,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  itemDetails: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  itemObservation: {
    fontSize: 13,
    color: '#555',
    marginTop: 4,
  },
  
  // Total
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#e5293e',
    borderRadius: 12,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  
  // Botões de ação
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#e5293e',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Estilos antigos (mantidos para compatibilidade)
  centered: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  errorText: { 
    color: 'red', 
    fontSize: 16 
  },
  snackbar: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  snackbarText: { 
    color: '#fff', 
    fontWeight: 'bold' 
  },
});

export default PedidosDoEstabelecimentoScreen;

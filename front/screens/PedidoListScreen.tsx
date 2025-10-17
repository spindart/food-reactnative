import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, ScrollView, Image } from 'react-native';
import api from '../services/api';
import { updateOrderStatus } from '../services/orderService';
import { getCurrentUser } from '../services/currentUserService';
import EvaluationForm from '../components/EvaluationForm';
import { useFocusEffect } from '@react-navigation/native';

type Pedido = {
  id: string;
  clienteId: string;
  estabelecimentoId: string;
  status: string;
  createdAt: string;
  itens?: any[];
  formaPagamento?: string;
  estabelecimento?: { nome: string; imagem?: string };
  total?: number;
};

const PedidoListScreen: React.FC = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pedidoAvaliado, setPedidoAvaliado] = useState<boolean>(false);

  const fetchPedidos = async () => {
    try {
      const user = await getCurrentUser();
      if (!user?.id) {
        setError('Usuário não autenticado.');
        setLoading(false);
        return;
      }
      const response = await api.get(`/pedidos/cliente/${user.id}`);
      console.log('Resposta pedidos:', JSON.stringify(response.data, null, 2));
      // Separa pedidos em atuais e históricos
      const pedidosAtuais = response.data.filter((p: any) => p.status !== 'entregue' && p.status !== 'cancelado');
      const pedidosHistorico = response.data.filter((p: any) => p.status === 'entregue' || p.status === 'cancelado');
      setPedidos([...pedidosAtuais, ...pedidosHistorico]);
    } catch (err) {
      setError('Erro ao carregar os pedidos.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      fetchPedidos();
    }, [])
  );

  const handleUpdateStatus = async (pedidoId: string) => {
    try {
      const updatedOrder = await updateOrderStatus(pedidoId);
      setPedidos((prevPedidos) =>
        prevPedidos.map((pedido) =>
          pedido.id === pedidoId ? { ...pedido, status: updatedOrder.status } : pedido
        )
      );
    } catch (error) {
      setError('Erro ao atualizar o status do pedido.');
    }
  };

  // Mapeamento de status para label e ícone
  const statusMap: Record<string, { label: string; color: string; icon: string }> = {
    pendente: { label: 'Pendente', color: '#e5293e', icon: '⏳' },
    preparo: { label: 'Em preparo', color: '#f7b731', icon: '🍳' },
    entregue: { label: 'Entregue', color: '#2ecc71', icon: '✅' },
    cancelado: { label: 'Cancelado', color: '#e74c3c', icon: '❌' },
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

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={pedidos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const statusInfo = statusMap[item.status] || { label: item.status, color: '#888', icon: '❔' };
          const isPedidoAtual = item.status === 'pendente' || item.status === 'preparo';
          
          // Calcular total se não estiver disponível
          let totalPedido = item.total;
          if (!totalPedido && item.itens) {
            totalPedido = item.itens.reduce((sum: number, itemPedido: any) => {
              return sum + (itemPedido.precoUnitario * itemPedido.quantidade);
            }, 0);
          }
          
          return (
            <TouchableOpacity onPress={async () => {
              setSelectedPedido(item);
              setModalVisible(true);
              // Checa se já foi avaliado
              try {
                const res = await api.get(`/avaliacoes/avaliar`, {
                  params: {
                    estabelecimentoId: item.estabelecimentoId,
                    usuarioId: item.clienteId,
                  },
                });
                setPedidoAvaliado(res.data && res.data.avaliado === true);
              } catch {
                setPedidoAvaliado(false);
              }
            }}>
              <View style={[
                styles.card,
                isPedidoAtual && styles.cardAtual
              ]}>
                {isPedidoAtual && (
                  <View style={styles.badgeAtual}>
                    <Text style={styles.badgeText}>PEDIDO EM ANDAMENTO</Text>
                  </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {item.estabelecimento?.imagem ? (
                    <Image source={{ uri: item.estabelecimento.imagem }} style={styles.estabImage} />
                  ) : (
                    <Image source={require('../assets/icon.png')} style={styles.estabImage} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.estabName}>{item.estabelecimento?.nome || 'Estabelecimento'}</Text>
                    <Text style={styles.id}>Pedido ID: {item.id}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.total, isPedidoAtual && styles.totalAtual]}>
                      R$ {totalPedido?.toFixed(2) ?? '--'}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 16, marginBottom: 2 }}>
                  <Text style={{ fontSize: 18, marginRight: 6 }}>{statusInfo.icon}</Text>
                  <Text style={[styles.status, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                </View>
                <Text style={styles.date}>Data: {new Date(item.createdAt).toLocaleString()}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.list}
      />
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes do Pedido</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {selectedPedido && (
                <>
                  <View style={styles.estabelecimentoInfo}>
                    {selectedPedido.estabelecimento?.imagem ? (
                      <Image source={{ uri: selectedPedido.estabelecimento.imagem }} style={styles.estabImageModal} />
                    ) : (
                      <Image source={require('../assets/icon.png')} style={styles.estabImageModal} />
                    )}
                    <View style={styles.estabelecimentoDetails}>
                      <Text style={styles.estabelecimentoNome}>{selectedPedido.estabelecimento?.nome || 'Estabelecimento'}</Text>
                      <Text style={styles.pedidoId}>Pedido #{selectedPedido.id}</Text>
                    </View>
                  </View>
                  <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Status: <Text style={{ color: statusMap[selectedPedido.status]?.color || '#888' }}>{statusMap[selectedPedido.status]?.label || selectedPedido.status}</Text></Text>
                  <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Data: <Text style={{ fontWeight: 'normal' }}>{new Date(selectedPedido.createdAt).toLocaleString()}</Text></Text>
                  {selectedPedido.formaPagamento && (
                    <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Forma de Pagamento: <Text style={{ fontWeight: 'normal' }}>{selectedPedido.formaPagamento}</Text></Text>
                  )}
                  <Text style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 16 }}>Itens do pedido:</Text>
                  {selectedPedido.itens && selectedPedido.itens.length > 0 ? (
                    selectedPedido.itens.map((item, idx) => {
                      const itemTotal = item.precoUnitario * item.quantidade;
                      return (
                        <View key={idx} style={styles.itemPedido}>
                          <View style={styles.itemInfo}>
                            <Text style={styles.itemNome}>{item.quantidade}x {item.produto?.nome || 'Produto'}</Text>
                            <Text style={styles.itemPreco}>R$ {item.precoUnitario?.toFixed(2)}</Text>
                          </View>
                          <Text style={styles.itemTotal}>R$ {itemTotal.toFixed(2)}</Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={{ marginLeft: 12, marginBottom: 2 }}>Produtos não disponíveis</Text>
                  )}
                  
                  {/* Cálculo do total correto */}
                  {selectedPedido.itens && selectedPedido.itens.length > 0 && (
                    <View style={styles.totalContainer}>
                      <View style={styles.totalLine}>
                        <Text style={styles.totalLabel}>Subtotal:</Text>
                        <Text style={styles.totalValue}>
                          R$ {selectedPedido.itens.reduce((sum, item) => sum + (item.precoUnitario * item.quantidade), 0).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.totalLine}>
                        <Text style={styles.totalLabel}>Taxa de entrega:</Text>
                        <Text style={styles.totalValue}>R$ 5,00</Text>
                      </View>
                      <View style={[styles.totalLine, styles.totalFinal]}>
                        <Text style={styles.totalFinalLabel}>Total:</Text>
                        <Text style={styles.totalFinalValue}>
                          R$ {(selectedPedido.itens.reduce((sum, item) => sum + (item.precoUnitario * item.quantidade), 0) + 5).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  )}
                  {/* Avaliação - somente para pedidos entregues */}
                  {selectedPedido.status === 'entregue' && (
                    <View style={styles.avaliacaoContainer}>
                      <Text style={styles.avaliacaoTitle}>Avalie seu pedido:</Text>
                      {pedidoAvaliado ? (
                        <View style={styles.avaliacaoJaFeita}>
                          <Text style={styles.avaliacaoJaFeitaText}>✅ Você já avaliou este pedido.</Text>
                        </View>
                      ) : (
                        <EvaluationForm onSubmit={async (nota, comentario) => {
                          if (!selectedPedido) return;
                          try {
                            await api.post('/avaliacoes/avaliar', {
                              pedidoId: selectedPedido.id,
                              nota,
                              comentario,
                            });
                            alert('Avaliação enviada com sucesso!');
                            setPedidoAvaliado(true);
                          } catch (err) {
                            alert('Erro ao enviar avaliação.');
                          }
                        }} />
                      )}
                    </View>
                  )}
                  
                  {/* Status específico para pedidos em andamento */}
                  {selectedPedido.status === 'pendente' && (
                    <View style={styles.statusContainer}>
                      <Text style={styles.statusText}>⏳ Aguardando aceitação do estabelecimento!</Text>
                    </View>
                  )}
                  
                  {selectedPedido.status === 'preparo' && (
                    <View style={styles.statusContainer}>
                      <Text style={styles.statusText}>🍳 Seu pedido está sendo preparado!</Text>
                    </View>
                  )}
                  
                  {selectedPedido.status === 'entregue' && (
                    <View style={styles.statusContainer}>
                      <Text style={styles.statusText}>✅ Pedido entregue com sucesso!</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  estabImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
    margin: 10,
    backgroundColor: '#eee',
  },
  estabImageModal: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#eee',
  },
  estabName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#222',
    marginTop: 8,
    marginLeft: 0,
  },
  list: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 0,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f1f1',
  },
  cardAtual: {
    borderColor: '#e5293e',
    borderWidth: 2,
    backgroundColor: '#fff5f5',
  },
  badgeAtual: {
    backgroundColor: '#e5293e',
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginTop: 8,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  total: {
    fontWeight: 'bold',
    color: '#222',
    fontSize: 16,
  },
  totalAtual: {
    color: '#e5293e',
    fontSize: 18,
    fontWeight: 'bold',
  },
  id: {
    fontSize: 17,
    fontWeight: 'bold',
    marginTop: 14,
    marginLeft: 16,
    marginBottom: 2,
    color: '#222',
  },
  status: {
    fontSize: 15,
    marginLeft: 16,
    marginBottom: 2,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 14,
    color: '#888',
    marginLeft: 16,
    marginBottom: 14,
  },
  button: {
    backgroundColor: '#e5293e',
    paddingVertical: 12,
    borderRadius: 0,
    alignItems: 'center',
    width: '100%',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  // Estilos para detalhes do pedido (estilo iFood)
  itemPedido: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemNome: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  itemPreco: {
    fontSize: 14,
    color: '#666',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e5293e',
  },
  totalContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  totalFinal: {
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    paddingTop: 8,
    marginTop: 8,
    marginBottom: 0,
  },
  totalFinalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalFinalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e5293e',
  },
  avaliacaoContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  avaliacaoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  avaliacaoJaFeita: {
    backgroundColor: '#d4edda',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  avaliacaoJaFeitaText: {
    color: '#155724',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statusContainer: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    textAlign: 'center',
  },
  // Estilos do modal (estilo iFood)
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  estabelecimentoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  estabelecimentoDetails: {
    marginLeft: 12,
    flex: 1,
  },
  estabelecimentoNome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  pedidoId: {
    fontSize: 14,
    color: '#666',
  },
});

export default PedidoListScreen;

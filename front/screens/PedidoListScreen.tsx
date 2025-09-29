import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, ScrollView, Image } from 'react-native';
import api from '../services/api';
import { updateOrderStatus } from '../services/orderService';
import { getCurrentUser } from '../services/currentUserService';
import EvaluationForm from '../components/EvaluationForm';

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

  useEffect(() => {
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

    fetchPedidos();
  }, []);

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
              <View style={styles.card}>
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
                    <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 16 }}>R$ {item.total?.toFixed(2) ?? '--'}</Text>
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
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 24, width: '90%', maxHeight: '80%' }}>
            <ScrollView>
              <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>Detalhes do Pedido</Text>
              {selectedPedido && (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    {selectedPedido.estabelecimento?.imagem ? (
                      <Image source={{ uri: selectedPedido.estabelecimento.imagem }} style={styles.estabImageModal} />
                    ) : (
                      <Image source={require('../assets/icon.png')} style={styles.estabImageModal} />
                    )}
                    <View style={{ marginLeft: 10 }}>
                      <Text style={{ fontWeight: 'bold', fontSize: 18 }}>{selectedPedido.estabelecimento?.nome || 'Estabelecimento'}</Text>
                      <Text style={{ color: '#888', fontSize: 13 }}>Pedido ID: {selectedPedido.id}</Text>
                    </View>
                  </View>
                  <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Status: <Text style={{ color: statusMap[selectedPedido.status]?.color || '#888' }}>{statusMap[selectedPedido.status]?.label || selectedPedido.status}</Text></Text>
                  <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Data: <Text style={{ fontWeight: 'normal' }}>{new Date(selectedPedido.createdAt).toLocaleString()}</Text></Text>
                  {selectedPedido.formaPagamento && (
                    <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Forma de Pagamento: <Text style={{ fontWeight: 'normal' }}>{selectedPedido.formaPagamento}</Text></Text>
                  )}
                  <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Detalhe do pedido:</Text>
                  {selectedPedido.itens && selectedPedido.itens.length > 0 ? (
                    selectedPedido.itens.map((item, idx) => (
                      <Text key={idx} style={{ marginLeft: 12, marginBottom: 2 }}>- {item.quantidade}x {item.produto?.nome || 'Produto'} (R$ {item.precoUnitario?.toFixed(2)})</Text>
                    ))
                  ) : (
                    <Text style={{ marginLeft: 12, marginBottom: 2 }}>Produtos não disponíveis</Text>
                  )}
                  <Text style={{ fontWeight: 'bold', marginTop: 8 }}>Total: <Text style={{ fontWeight: 'normal' }}>R$ {selectedPedido.total?.toFixed(2) ?? '--'}</Text></Text>
                  <View style={{ marginTop: 16 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 6 }}>Avalie seu pedido:</Text>
                    {pedidoAvaliado ? (
                      <Text style={{ color: '#2ecc71', fontWeight: 'bold' }}>Você já avaliou este pedido.</Text>
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
                </>
              )}
              <TouchableOpacity style={{ marginTop: 18, alignSelf: 'center' }} onPress={() => setModalVisible(false)}>
                <Text style={{ color: '#e5293e', fontWeight: 'bold', fontSize: 16 }}>Fechar</Text>
              </TouchableOpacity>
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
});

export default PedidoListScreen;

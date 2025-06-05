import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import api from '../services/api';
import { updateOrderStatus } from '../services/orderService';
import { getCurrentUser } from '../services/currentUserService';

type Pedido = {
  id: string;
  clienteId: string;
  estabelecimentoId: string;
  status: string;
  createdAt: string;
};

const PedidoListScreen: React.FC = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
    <FlatList
      data={pedidos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const statusInfo = statusMap[item.status] || { label: item.status, color: '#888', icon: '❔' };
        return (
          <View style={styles.card}>
            <Text style={styles.id}>Pedido ID: {item.id}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 16, marginBottom: 2 }}>
              <Text style={{ fontSize: 18, marginRight: 6 }}>{statusInfo.icon}</Text>
              <Text style={[styles.status, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            </View>
            <Text style={styles.date}>Data: {new Date(item.createdAt).toLocaleString()}</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => handleUpdateStatus(item.id)}
            >
              <Text style={styles.buttonText}>Atualizar Status</Text>
            </TouchableOpacity>
          </View>
        );
      }}
      contentContainerStyle={styles.list}
    />
  );
};

const styles = StyleSheet.create({
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

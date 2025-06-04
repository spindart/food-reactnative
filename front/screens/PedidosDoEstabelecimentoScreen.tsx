import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRoute } from '@react-navigation/native';
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
}

interface Pedido {
  id: string;
  clienteId: string;
  estabelecimentoId: string;
  status: string;
  createdAt: string;
  itens: PedidoItem[];
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
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string; type: string }>({
    visible: false,
    message: '',
    type: '',
  });

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const response = await api.get(`/pedidos/estabelecimento/${estabelecimento.id}`);
        setPedidos(response.data);
        // Buscar dados dos clientes
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
        // Buscar nomes dos produtos
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
      } catch (err) {
        setError('Erro ao carregar pedidos.');
      } finally {
        setLoading(false);
      }
    };
    fetchPedidos();
  }, [estabelecimento.id]);

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
    setCancelLoading(pedidoId);
    try {
      await cancelOrder(pedidoId);
      setPedidos((prev) => prev.filter((p) => p.id !== pedidoId));
      setSnackbar({ visible: true, message: 'Pedido cancelado!', type: 'success' });
    } catch {
      setSnackbar({ visible: true, message: 'Erro ao cancelar pedido.', type: 'error' });
    } finally {
      setCancelLoading(null);
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pedidos de {estabelecimento.nome}</Text>
      <FlatList
        data={pedidos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.id}>Pedido ID: {item.id}</Text>
            <Text style={styles.status}>Status: {item.status}</Text>
            <Text style={styles.date}>Data: {new Date(item.createdAt).toLocaleString()}</Text>
            <Text style={styles.cliente}>Cliente: {clientes[item.clienteId]?.nome || '...'}</Text>
            <Text style={styles.subtitle}>Itens:</Text>
            {item.itens.map((it) => (
              <Text key={it.id} style={styles.item}>
                Produto: {produtos[it.produtoId]?.nome || it.produtoId} | Qtd: {it.quantidade} | Preço: R$ {it.precoUnitario.toFixed(2)}
              </Text>
            ))}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#007BFF', marginTop: 10, opacity: statusLoading === item.id ? 0.6 : 1 }]}
              onPress={() => handleUpdateStatus(item.id)}
              disabled={statusLoading === item.id || item.status === 'entregue' || item.status === 'cancelado'}
            >
              <Text style={styles.buttonText}>
                {statusLoading === item.id
                  ? 'Atualizando...'
                  : item.status === 'pendente'
                  ? 'Avançar para Preparo'
                  : item.status === 'preparo'
                  ? 'Marcar como Entregue'
                  : 'Finalizado'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#D32F2F', marginTop: 8, opacity: cancelLoading === item.id ? 0.6 : 1 }]}
              onPress={() => handleCancelOrder(item.id)}
              disabled={cancelLoading === item.id || item.status === 'entregue' || item.status === 'cancelado'}
            >
              <Text style={styles.buttonText}>{cancelLoading === item.id ? 'Cancelando...' : 'Cancelar Pedido'}</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={pedidos.length === 0 ? styles.centered : undefined}
        ListEmptyComponent={<Text>Nenhum pedido encontrado.</Text>}
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
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  card: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 16, marginBottom: 12 },
  id: { fontSize: 16, fontWeight: 'bold' },
  status: { fontSize: 14, color: '#666' },
  date: { fontSize: 14, color: '#888', marginBottom: 8 },
  cliente: { fontSize: 14, color: '#222', marginBottom: 4 },
  subtitle: { fontWeight: 'bold', marginTop: 8 },
  item: { fontSize: 13, color: '#333' },
  button: { borderRadius: 8, padding: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: 'red', fontSize: 16 },
  snackbar: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  snackbarText: { color: '#fff', fontWeight: 'bold' },
});

export default PedidosDoEstabelecimentoScreen;

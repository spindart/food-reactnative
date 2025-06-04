import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { createOrder } from '../services/orderService';
import { useCart } from '../context/CartContext';
import { getCurrentUser } from '../services/currentUserService';
import { useRoute } from '@react-navigation/native';

const CheckoutScreen: React.FC = () => {
  const { state: cartState, dispatch } = useCart();
  const route = useRoute<any>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);

  React.useEffect(() => {
    getCurrentUser().then((user) => {
      setUserId(user?.id ? String(user.id) : null);
    });
    if (route.params?.estabelecimentoId) {
      setEstabelecimentoId(String(route.params.estabelecimentoId));
    }
  }, [route.params]);

  const cartItems = cartState.items;

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + item.preco * item.quantidade, 0).toFixed(2);
  };

  const handleConfirmOrder = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (!userId || !estabelecimentoId) {
        setError('Usuário ou estabelecimento não encontrado.');
        setLoading(false);
        return;
      }
      const payload = {
        clienteId: userId,
        estabelecimentoId,
        itens: cartItems.map((item) => ({
          produtoId: item.id,
          quantidade: item.quantidade,
          precoUnitario: item.preco,
        })),
      };
      const response = await createOrder(payload);
      setSuccess('Pedido confirmado!');
      dispatch({ type: 'CLEAR_CART' });
    } catch (error) {
      setError('Erro ao confirmar pedido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={cartItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.name}>{item.nome}</Text>
            <Text style={styles.details}>Quantidade: {item.quantidade}</Text>
            <Text style={styles.details}>Preço: R$ {item.preco.toFixed(2)}</Text>
          </View>
        )}
        contentContainerStyle={styles.list}
      />
      <Text style={styles.total}>Total: R$ {calculateTotal()}</Text>
      {error && <Text style={{ color: 'red', textAlign: 'center' }}>{error}</Text>}
      {success && <Text style={{ color: 'green', textAlign: 'center' }}>{success}</Text>}
      <TouchableOpacity style={styles.button} onPress={handleConfirmOrder} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Enviando...' : 'Confirmar Pedido'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  list: {
    marginBottom: 16,
  },
  item: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  details: {
    fontSize: 14,
    color: '#666',
  },
  total: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CheckoutScreen;

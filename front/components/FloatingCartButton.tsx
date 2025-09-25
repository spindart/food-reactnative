import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useCart } from '../context/CartContext';
import { useNavigation } from '@react-navigation/native';

const FloatingCartButton: React.FC = () => {
  const { state } = useCart();
  const navigation = useNavigation();
  const total = state.items.reduce((sum, item) => sum + item.preco * item.quantidade, 0);
  const qtd = state.items.reduce((sum, item) => sum + item.quantidade, 0);
  if (qtd === 0) return null;
  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={() => navigation.navigate('HomeTabs', { screen: 'Carrinho' })}
      activeOpacity={0.85}
    >
      <Text style={styles.fabText}>{qtd} item{qtd > 1 ? 's' : ''} | R$ {total.toFixed(2)}</Text>
      <Text style={styles.fabGo}>Ver carrinho →</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: '#e5293e',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 4,
    zIndex: 100,
    shadowColor: '#e5293e',
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  fabText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  fabGo: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    marginTop: 2,
    opacity: 0.8,
  },
});

export default FloatingCartButton;

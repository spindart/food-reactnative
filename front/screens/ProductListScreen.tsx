import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Snackbar, ActivityIndicator } from 'react-native-paper';
import { getAllProdutos } from '../services/produtoService';
import ProductCard from '../components/ProductCard';

type Product = {
  id: string;
  nome: string;
  preco: number;
  imagem: string;
};

const ProductListScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getAllProdutos();
        setProducts(data);
      } catch (err) {
        setError('Erro ao carregar os produtos.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleAddToCart = (productId: string) => {
    console.log(`Produto ${productId} adicionado ao carrinho.`);
  };

  // Adicionar feedback visual para loading e erros
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  if (error) {
    return (
      <Snackbar
        visible={!!error}
        onDismiss={() => setError(null)}
        duration={3000}
        style={{ backgroundColor: 'red' }}
      >
        {error}
      </Snackbar>
    );
  }

  // Estilizar a lista de produtos com layout de grid usando numColumns
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard
            nome={item.nome}
            preco={item.preco}
            imagem={item.imagem}
            onAddToCart={() => handleAddToCart(item.id)}
          />
        )}
        numColumns={2}
        contentContainerStyle={{ padding: 8, paddingBottom: 32 }}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
});

export default ProductListScreen;

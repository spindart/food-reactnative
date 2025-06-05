import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Animated } from 'react-native';
import { Snackbar, ActivityIndicator } from 'react-native-paper';
import { getAllProdutos } from '../services/produtoService';
import ProductCard from '../components/ProductCard';
import BannerCarousel from '../components/BannerCarousel';
import CategoryBar from '../components/CategoryBar';

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
  const [selectedCategory, setSelectedCategory] = useState<string>('lanches');
  const [addAnim] = useState(new Animated.Value(1));

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

  const filteredProducts = products.filter((p) => {
    if (selectedCategory === 'lanches') return true;
    if (selectedCategory === 'bebidas') return p.nome.toLowerCase().includes('bebida');
    if (selectedCategory === 'sobremesas') return p.nome.toLowerCase().includes('sobremesa');
    if (selectedCategory === 'pizza') return p.nome.toLowerCase().includes('pizza');
    if (selectedCategory === 'japonesa') return p.nome.toLowerCase().includes('sushi') || p.nome.toLowerCase().includes('japonesa');
    if (selectedCategory === 'saudavel') return p.nome.toLowerCase().includes('salada') || p.nome.toLowerCase().includes('saudável');
    return true;
  });

  const handleAddToCart = (productId: string) => {
    Animated.sequence([
      Animated.timing(addAnim, { toValue: 1.15, duration: 120, useNativeDriver: true }),
      Animated.timing(addAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    console.log(`Produto ${productId} adicionado ao carrinho.`);
  };

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

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <BannerCarousel />
      <CategoryBar selected={selectedCategory} onSelect={setSelectedCategory} />
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Animated.View style={{ transform: [{ scale: addAnim }] }}>
            <ProductCard
              nome={item.nome}
              preco={item.preco}
              imagem={item.imagem}
              onAddToCart={() => handleAddToCart(item.id)}
            />
          </Animated.View>
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

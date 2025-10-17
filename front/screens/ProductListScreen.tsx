import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Animated, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Snackbar, ActivityIndicator } from 'react-native-paper';
import { getAllProdutos } from '../services/produtoService';
import ProductCard from '../components/ProductCard';
import BannerCarousel from '../components/BannerCarousel';
import { Ionicons } from '@expo/vector-icons';

type Product = {
  id: string;
  nome: string;
  preco: number;
  imagem: string;
  descricao?: string;
  categoria?: string;
};

const categories = [
  { key: 'todos', label: 'Todos', icon: 'grid-outline' },
  { key: 'lanches', label: 'Lanches', icon: 'fast-food-outline' },
  { key: 'bebidas', label: 'Bebidas', icon: 'wine-outline' },
  { key: 'sobremesas', label: 'Sobremesas', icon: 'ice-cream-outline' },
  { key: 'pizza', label: 'Pizza', icon: 'pizza-outline' },
  { key: 'japonesa', label: 'Japonesa', icon: 'restaurant-outline' },
  { key: 'saudavel', label: 'Saudável', icon: 'leaf-outline' },
];

const ProductListScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [addAnim] = useState(new Animated.Value(1));
  const [sortBy, setSortBy] = useState<'nome' | 'preco'>('nome');

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
    if (selectedCategory === 'todos') return true;
    if (selectedCategory === 'lanches') return p.nome.toLowerCase().includes('lanche') || p.nome.toLowerCase().includes('hambúrguer') || p.nome.toLowerCase().includes('sanduíche');
    if (selectedCategory === 'bebidas') return p.nome.toLowerCase().includes('bebida') || p.nome.toLowerCase().includes('refrigerante') || p.nome.toLowerCase().includes('suco') || p.nome.toLowerCase().includes('água');
    if (selectedCategory === 'sobremesas') return p.nome.toLowerCase().includes('sobremesa') || p.nome.toLowerCase().includes('doce') || p.nome.toLowerCase().includes('açúcar');
    if (selectedCategory === 'pizza') return p.nome.toLowerCase().includes('pizza') || p.nome.toLowerCase().includes('massa');
    if (selectedCategory === 'japonesa') return p.nome.toLowerCase().includes('sushi') || p.nome.toLowerCase().includes('japonesa') || p.nome.toLowerCase().includes('temaki');
    if (selectedCategory === 'saudavel') return p.nome.toLowerCase().includes('salada') || p.nome.toLowerCase().includes('saudável') || p.nome.toLowerCase().includes('verde');
    return true;
  }).sort((a, b) => {
    if (sortBy === 'nome') return a.nome.localeCompare(b.nome);
    if (sortBy === 'preco') return a.preco - b.preco;
    return 0;
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
    <View style={styles.container}>
      <BannerCarousel />
      
      {/* Header com título e filtros */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cardápio</Text>
        <View style={styles.sortContainer}>
          <TouchableOpacity 
            style={[styles.sortButton, sortBy === 'nome' && styles.sortButtonActive]}
            onPress={() => setSortBy('nome')}
          >
            <Ionicons name="text-outline" size={16} color={sortBy === 'nome' ? '#fff' : '#666'} />
            <Text style={[styles.sortText, sortBy === 'nome' && styles.sortTextActive]}>Nome</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.sortButton, sortBy === 'preco' && styles.sortButtonActive]}
            onPress={() => setSortBy('preco')}
          >
            <Ionicons name="cash-outline" size={16} color={sortBy === 'preco' ? '#fff' : '#666'} />
            <Text style={[styles.sortText, sortBy === 'preco' && styles.sortTextActive]}>Preço</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Categorias melhoradas */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.categoryButton, selectedCategory === cat.key && styles.categoryButtonActive]}
            onPress={() => setSelectedCategory(cat.key)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={cat.icon as any} 
              size={20} 
              color={selectedCategory === cat.key ? '#fff' : '#666'} 
            />
            <Text style={[styles.categoryText, selectedCategory === cat.key && styles.categoryTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Contador de produtos */}
      <View style={styles.counterContainer}>
        <Text style={styles.counterText}>
          {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Lista de produtos */}
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
        contentContainerStyle={styles.productsList}
        columnWrapperStyle={styles.productsRow}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Nenhum produto encontrado</Text>
            <Text style={styles.emptySubtext}>Tente selecionar outra categoria</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  sortContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    padding: 4,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginHorizontal: 2,
  },
  sortButtonActive: {
    backgroundColor: '#e5293e',
  },
  sortText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 4,
  },
  sortTextActive: {
    color: '#fff',
  },
  categoriesContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoriesContent: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  categoryButtonActive: {
    backgroundColor: '#e5293e',
    borderColor: '#e5293e',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
  },
  categoryTextActive: {
    color: '#fff',
  },
  counterContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  counterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  productsList: {
    padding: 16,
    paddingBottom: 32,
  },
  productsRow: {
    justifyContent: 'space-between',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
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

import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, TextInput, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAllEstabelecimentos } from '../services/estabelecimentoService';
import { RootStackParamList } from '../types';

const categorias = [
  { key: 'restaurante', label: 'Restaurantes' },
  { key: 'mercado', label: 'Mercados' },
  { key: 'bebidas', label: 'Bebidas' },
  { key: 'farmacia', label: 'Farmácias' },
  { key: 'pet', label: 'Pet' },
];

const fakeImages = [
  require('../assets/icon.png'),
  require('../assets/splash-icon.png'),
  require('../assets/adaptive-icon.png'),
];

const EstabelecimentoListScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [estabelecimentos, setEstabelecimentos] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('restaurante');

  useEffect(() => {
    const fetchEstabelecimentos = async () => {
      try {
        const data = await getAllEstabelecimentos();
        setEstabelecimentos(data);
      } catch (err) {
        setError('Erro ao carregar os estabelecimentos.');
      } finally {
        setLoading(false);
      }
    };
    fetchEstabelecimentos();
  }, []);

  const handleViewProducts = (estabelecimento: any) => {
    navigation.navigate('ProdutosDoEstabelecimento', { estabelecimento });
  };

  // Filtro por busca e categoria (fake: todos são restaurante)
  const filtered = estabelecimentos.filter(e =>
    (e.nome.toLowerCase().includes(search.toLowerCase()) || e.descricao.toLowerCase().includes(search.toLowerCase())) &&
    (categoria === 'restaurante' || e.tipo === categoria)
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e5293e" />
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
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Banners promocionais */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8, marginBottom: 16, paddingLeft: 8 }}>
        <TouchableOpacity onPress={() => {/* abrir promoção 1 */}} activeOpacity={0.8}>
          <Image source={require('../assets/icon.png')} style={{ width: 320, height: 120, borderRadius: 18, marginRight: 12, backgroundColor: '#f6f6f6' }} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {/* abrir promoção 2 */}} activeOpacity={0.8}>
          <Image source={require('../assets/splash-icon.png')} style={{ width: 320, height: 120, borderRadius: 18, marginRight: 12, backgroundColor: '#f6f6f6' }} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {/* abrir promoção 3 */}} activeOpacity={0.8}>
          <Image source={require('../assets/adaptive-icon.png')} style={{ width: 320, height: 120, borderRadius: 18, marginRight: 12, backgroundColor: '#f6f6f6' }} />
        </TouchableOpacity>
      </ScrollView>
      {/* Barra de busca */}
      <TextInput
        style={styles.search}
        placeholder="Buscar estabelecimento..."
        value={search}
        onChangeText={setSearch}
        placeholderTextColor="#aaa"
      />
      {/* Categorias */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, paddingLeft: 8 }}>
        {categorias.map(cat => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.category, categoria === cat.key && styles.selectedCategory]}
            onPress={() => setCategoria(cat.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.categoryLabel, categoria === cat.key && styles.selectedCategoryLabel]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {/* Lista de estabelecimentos */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <TouchableOpacity activeOpacity={0.85} onPress={() => handleViewProducts(item)}>
            <View style={styles.card}>
              <Image source={fakeImages[index % fakeImages.length]} style={styles.estabImage} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.nome}</Text>
                <Text style={styles.description}>{item.descricao}</Text>
                <Text style={styles.address}>{item.endereco}</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoText}>⭐ 4.{index+1} </Text>
                  <Text style={styles.infoText}>• 35-50 min </Text>
                  <Text style={styles.infoText}>• R$ 5,99</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
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
  search: {
    backgroundColor: '#f6f6f6',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginBottom: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#eee',
    color: '#222',
  },
  category: {
    backgroundColor: '#f6f6f6',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectedCategory: {
    backgroundColor: '#e5293e',
    borderColor: '#e5293e',
  },
  categoryLabel: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 15,
  },
  selectedCategoryLabel: {
    color: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
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
  estabImage: {
    width: 90,
    height: 90,
    borderRadius: 18,
    margin: 12,
    backgroundColor: '#f6f6f6',
  },
  name: {
    fontSize: 19,
    fontWeight: 'bold',
    marginTop: 8,
    marginLeft: 0,
    marginBottom: 2,
    color: '#222',
  },
  description: {
    fontSize: 15,
    color: '#666',
    marginLeft: 0,
    marginBottom: 2,
  },
  address: {
    fontSize: 14,
    color: '#888',
    marginLeft: 0,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 0,
    marginBottom: 8,
  },
  infoText: {
    color: '#e5293e',
    fontWeight: 'bold',
    fontSize: 13,
    marginRight: 8,
  },
});

export default EstabelecimentoListScreen;

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getProdutoByEstabelecimento } from '../services/produtoService';

type Produto = {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  estabelecimentoId: string;
};

const ProdutosDoEstabelecimentoScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { estabelecimento } = route.params;
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProdutos = async () => {
      try {
        const data = await getProdutoByEstabelecimento(estabelecimento.id);
        setProdutos(data);
      } catch (err) {
        setError('Erro ao carregar produtos.');
      } finally {
        setLoading(false);
      }
    };
    fetchProdutos();
  }, [estabelecimento.id]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Produtos de {estabelecimento.nome}</Text>
      {loading ? (
        <Text>Carregando...</Text>
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={produtos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.nome}</Text>
              <Text style={styles.desc}>{item.descricao}</Text>
              <Text style={styles.price}>R$ {item.preco.toFixed(2)}</Text>
              <TouchableOpacity style={[styles.button, { backgroundColor: '#FFA500', marginTop: 8 }]} onPress={() => navigation.navigate('EditarProduto' as never, { produto: item } as never)}>
                <Text style={styles.buttonText}>Editar/Remover</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  card: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 16, marginBottom: 12 },
  name: { fontSize: 18, fontWeight: 'bold' },
  desc: { fontSize: 14, color: '#666' },
  price: { fontSize: 16, color: '#007BFF', marginTop: 4 },
  errorText: { color: 'red', fontSize: 14 },
  button: { borderRadius: 8, padding: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});

export default ProdutosDoEstabelecimentoScreen;

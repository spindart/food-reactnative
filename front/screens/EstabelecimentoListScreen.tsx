import React, { useEffect, useMemo, useState } from 'react';
import { View, FlatList, Text, ActivityIndicator, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAllEstabelecimentos, getAvaliacoes, avaliarEstabelecimento } from '../services/estabelecimentoService';
import { getCategorias, Categoria } from '../services/categoriaService';
import { getAllProdutos, Produto } from '../services/produtoService';
import { RootStackParamList } from '../types';
import BannerCarousel from '../components/BannerCarousel';
import HomeHeader from '../components/HomeHeader';
import CategoryIcons from '../components/CategoryIcons';
import RestaurantCard from '../components/RestaurantCard';

const EstabelecimentoListScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [estabelecimentos, setEstabelecimentos] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoria, setCategoria] = useState<string>('');
  const [avaliacoes, setAvaliacoes] = useState<Record<string, any>>({});
  const [nota, setNota] = useState<number>(0);
  const [comentario, setComentario] = useState<string>('');
  const [produtos, setProdutos] = useState<Produto[]>([]);

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

  const fetchAvaliacoes = async (estabelecimentoId: string) => {
    try {
      const data = await getAvaliacoes(estabelecimentoId);
      setAvaliacoes((prev) => ({ ...prev, [estabelecimentoId]: data }));
    } catch (err) {
      console.error('Erro ao carregar avaliações:', err);
    }
  };

  const handleAvaliar = async (estabelecimentoId: string, nota: number, comentario: string) => {
    try {
      await avaliarEstabelecimento(estabelecimentoId, { nota, comentario });
      setNota(0);
      setComentario('');
      fetchAvaliacoes(estabelecimentoId);
    } catch (err) {
      console.error('Erro ao enviar avaliação:', err);
    }
  };

  useEffect(() => {
    estabelecimentos.forEach((e) => fetchAvaliacoes(e.id));
  }, [estabelecimentos]);

  const handleViewProducts = (estabelecimento: any) => {
    navigation.navigate('ProdutosDoEstabelecimento', { estabelecimento });
  };

  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const data = await getCategorias();
        setCategorias(data);
        // Começar com "Todos" selecionado (string vazia)
        setCategoria('');
      } catch (err) {
        // fallback: não faz nada
      }
    };
    fetchCategorias();
  }, []);

  useEffect(() => {
    const fetchProdutos = async () => {
      try {
        const all = await getAllProdutos();
        setProdutos(all || []);
      } catch {}
    };
    fetchProdutos();
  }, []);

  // Filtro por busca e categoria
  const filtered = useMemo(() => estabelecimentos.filter(e => {
    const term = search.trim().toLowerCase();
    const nomeMatch = e.nome.toLowerCase().includes(term) || e.descricao.toLowerCase().includes(term);
    const categoriaMatch = (e.categorias || []).some((cat: Categoria) => cat.nome.toLowerCase().includes(term));
    const produtoMatch = produtos.some((p) => {
      const belongs = String(p.estabelecimentoId ?? '') === String(e.id);
      return belongs && p.nome.toLowerCase().includes(term);
    });
    
    // Se "Todos" estiver selecionado (categoria vazia), mostra todos conforme busca
    if (!categoria || categoria === '') {
      return term ? (nomeMatch || categoriaMatch || produtoMatch) : true;
    }
    
    // Se o estabelecimento não tiver categorias e houver busca, verifica apenas busca
    if (!e.categorias || e.categorias.length === 0) {
      return nomeMatch || categoriaMatch || produtoMatch;
    }
    
    // Se houver categoria selecionada, filtra por categoria E busca
    const matchesCategory = e.categorias.some((cat: Categoria) => cat.nome === categoria);
    if (term) {
      return matchesCategory && (nomeMatch || categoriaMatch || produtoMatch);
    }
    return matchesCategory;
  }), [estabelecimentos, search, categoria, produtos]);

  const featured = useMemo(() => filtered.slice(0, 6), [filtered]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#ea1d2c" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <Text className="text-red-600 text-base">{error}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      {/* Header Fixo */}
      <View className="bg-white shadow-sm z-10">
        <HomeHeader search={search} onChangeSearch={setSearch} />
      </View>

      <Animated.FlatList
        ListHeaderComponent={
          <View>
            <BannerCarousel />
            <CategoryIcons categorias={categorias} selected={categoria} onSelect={setCategoria} />
            
            {featured.length > 0 && (
              <View className="px-4 mt-2 mb-3">
                <Text className="text-lg font-bold text-gray-800 mb-3">Lojas em destaque</Text>
                <FlatList
                  data={featured}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <RestaurantCard
                      restaurant={item}
                      rating={avaliacoes[item.id]}
                      onPress={() => handleViewProducts(item)}
                      variant="horizontal"
                    />
                  )}
                  contentContainerStyle={{ paddingLeft: 12, paddingRight: 16 }}
                />
              </View>
            )}
            
            <View className="px-4 pt-2 pb-3">
              <Text className="text-lg font-bold text-gray-800 mb-2">Todos os estabelecimentos</Text>
            </View>
          </View>
        }
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="px-4">
            <RestaurantCard
              restaurant={item}
              rating={avaliacoes[item.id]}
              onPress={() => handleViewProducts(item)}
              variant="vertical"
            />
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default EstabelecimentoListScreen;

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, SectionList, TouchableOpacity, Image, Modal, Pressable, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getProdutoByEstabelecimento } from '../services/produtoService';
import { listProdutoCategorias } from '../services/produtoCategoriaService';
import { getCurrentUser } from '../services/currentUserService';
import { useCart } from '../context/CartContext';
import { Alert } from 'react-native';
import { avaliacaoService } from '../services/avaliacaoService';



const ProdutosDoEstabelecimentoScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { estabelecimento } = route.params;
  const [isDono, setIsDono] = useState(false);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState<number | null>(null); // null = todos
  const [categorias, setCategorias] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalProduto, setModalProduto] = useState<any | null>(null);
  const [modalEstabelecimentoVisible, setModalEstabelecimentoVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'informacoes' | 'avaliacoes'>('informacoes');
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [loadingAvaliacoes, setLoadingAvaliacoes] = useState(false);
  const [errorAvaliacoes, setErrorAvaliacoes] = useState<string | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState('');
  const { state: cartState } = useCart();

  useEffect(() => {
    const fetchProdutos = async () => {
      try {
        setLoading(true);
        const data = await getProdutoByEstabelecimento(estabelecimento.id, selectedCategoria ?? undefined);
        setProdutos(data);
      } catch (err) {
        setError('Erro ao carregar produtos.');
      } finally {
        setLoading(false);
      }
    };
    fetchProdutos();
    listProdutoCategorias(estabelecimento.id).then(setCategorias).catch(() => {});
    // Verifica se usuário é dono
    const checkDono = async () => {
      const user = await getCurrentUser();
      if (user && (user.id === estabelecimento.donoId || user.role === 'DONO')) {
        setIsDono(true);
      } else {
        setIsDono(false);
      }
    };
    checkDono();

    const unsubscribe = navigation.addListener('focus', () => {
      fetchProdutos();
    });
    return unsubscribe;
  }, [estabelecimento.id, navigation, selectedCategoria]);

  // Carregar avaliações quando a aba mudar para 'avaliacoes'
  useEffect(() => {
    if (activeTab === 'avaliacoes' && modalEstabelecimentoVisible) {
      loadAvaliacoes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, modalEstabelecimentoVisible]);

  const loadAvaliacoes = async () => {
    try {
      setLoadingAvaliacoes(true);
      setErrorAvaliacoes(null);
      
      // Garantir que o ID seja um número
      const estabelecimentoId = typeof estabelecimento.id === 'string' 
        ? parseInt(estabelecimento.id) 
        : estabelecimento.id;
      
      console.log('🔍 Carregando avaliações para estabelecimento:', estabelecimentoId);
      
      if (isNaN(estabelecimentoId)) {
        throw new Error('ID do estabelecimento inválido');
      }
      
      const response = await avaliacaoService.listarPorEstabelecimento(
        estabelecimentoId,
        20,
        0
      );
      
      console.log('📦 Resposta completa da API:', JSON.stringify(response, null, 2));
      
      // O backend retorna { avaliacoes, total, limit, offset }
      if (response && response.avaliacoes) {
        const avaliacoesArray = Array.isArray(response.avaliacoes) ? response.avaliacoes : [];
        console.log('✅ Avaliações processadas:', avaliacoesArray.length, avaliacoesArray);
        setAvaliacoes(avaliacoesArray);
      } else {
        console.log('⚠️ Resposta sem avaliações ou formato incorreto');
        setAvaliacoes([]);
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar avaliações:', error);
      console.error('❌ Detalhes do erro:', {
        response: error.response?.data,
        status: error.response?.status,
        message: error.message
      });
      const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message || 'Erro ao carregar avaliações';
      setErrorAvaliacoes(errorMessage);
      setAvaliacoes([]);
    } finally {
      setLoadingAvaliacoes(false);
    }
  };

  // Agrupa produtos por categoria
  const sections = React.useMemo(() => {
    const categoriasMap = new Map<number, any>();
    categorias.forEach((c) => categoriasMap.set(c.id, c));

    const groups = new Map<number | 'uncat', any[]>();
    produtos.forEach((p: any) => {
      const key = typeof p.produtoCategoriaId === 'number' ? p.produtoCategoriaId : 'uncat';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    });

    const buildSection = (catId: number | 'uncat') => {
      if (catId === 'uncat') {
        return { catId: 'uncat' as const, title: 'Outros', data: groups.get(catId) || [] };
      }
      const cat = categoriasMap.get(catId);
      return { catId, title: cat?.nome || 'Categoria', data: groups.get(catId) || [] };
    };

    let ordered: Array<{ catId: number | 'uncat'; title: string; data: any[] }>; 
    // Ordena conforme ordem das categorias + nome
    const orderedCats = [...categorias].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.nome.localeCompare(b.nome));
    ordered = orderedCats
      .map((c) => buildSection(c.id))
      .filter((s) => s.data.length > 0);

    // adiciona seção "Outros" ao final se houver
    if ((groups.get('uncat') || []).length > 0) {
      ordered.push(buildSection('uncat'));
    }

    // Quando a API já foi filtrada, não precisamos filtrar novamente, mas
    // se selectedCategoria estiver definida e por algum motivo a lista contiver várias seções,
    // garantimos que apenas a seção da categoria selecionada apareça.
    if (selectedCategoria) {
      return ordered.filter((s) => s.catId !== 'uncat' && s.catId === selectedCategoria);
    }
    return ordered;
  }, [produtos, categorias, selectedCategoria]);

  const openModal = (produto: any) => {
    setModalProduto(produto);
    setQuantidade(1);
    setObservacao('');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setModalProduto(null);
  };

  const { dispatch } = useCart();
  const handleAddToCart = () => {
    if (!modalProduto) return;
    // Verifica se já existe item no carrinho de outro estabelecimento
    const cartItems = cartState.items;
    if (cartItems.length > 0) {
      const currentEstId = cartItems[0].estabelecimentoId;
      if (currentEstId && currentEstId !== estabelecimento.id) {
        Alert.alert(
          'Novo pedido',
          'Você só pode adicionar produtos de um estabelecimento por vez. O carrinho será limpo para iniciar um novo pedido.',
          [
            {
              text: 'Cancelar',
              style: 'cancel',
            },
            {
              text: 'OK',
              onPress: () => {
                dispatch({ type: 'CLEAR_CART' });
                dispatch({
                  type: 'ADD_ITEM',
                  payload: {
                    cartItemId: `${modalProduto.id}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
                    id: modalProduto.id,
                    nome: modalProduto.nome,
                    preco: modalProduto.preco,
                    quantidade,
                    observacao,
                    estabelecimentoId: estabelecimento.id,
                  },
                });
                closeModal();
              },
            },
          ]
        );
        return;
      }
    }
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        cartItemId: `${modalProduto.id}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        id: modalProduto.id,
        nome: modalProduto.nome,
        preco: modalProduto.preco,
        quantidade,
        observacao,
        estabelecimentoId: estabelecimento.id,
      },
    });
    closeModal();
  };

  const totalCart = cartState.items.reduce((sum, item) => sum + item.preco * item.quantidade, 0);
  const qtdCart = cartState.items.reduce((sum, item) => sum + item.quantidade, 0);

  // Função para formatar dias da semana
  const getDiasSemana = (dias: number[]): string => {
    const diasNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    if (!dias || dias.length === 0) return 'Não informado';
    if (dias.length === 7) return 'Todos os dias';
    return dias.map(d => diasNomes[d]).join(', ');
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header com Banner e Botão Voltar */}
      <View className="relative">
        <Image
          source={estabelecimento.imagem ? { uri: estabelecimento.imagem } : require('../assets/icon.png')}
          className="w-full h-48 object-cover rounded-b-3xl"
          resizeMode="cover"
        />
        {/* Overlay escuro para melhorar legibilidade */}
        <View className="absolute inset-0 bg-black/20 rounded-b-3xl" />
        
        {/* Botão voltar sobreposto */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="absolute top-12 left-4 bg-white rounded-full p-2 shadow-lg z-10"
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#ea1d2c" />
        </TouchableOpacity>
        
        {/* Informações do estabelecimento sobre o banner */}
        <View className="absolute bottom-4 left-4 right-4 pl-14">
          <TouchableOpacity 
            onPress={() => setModalEstabelecimentoVisible(true)}
            activeOpacity={0.7}
          >
            <Text className="text-white text-2xl font-bold mb-2 shadow-lg">
              {estabelecimento.nome}
            </Text>
          </TouchableOpacity>
          
          {/* Informações adicionais */}
          <View className="flex-row items-center flex-wrap">
            {/* Tempo de entrega */}
            {(estabelecimento.tempoEntregaMin || estabelecimento.tempoEntregaMax) && (
              <View className="flex-row items-center mr-4">
                <Ionicons name="time-outline" size={16} color="#fff" />
                <Text className="text-white text-sm font-medium ml-1 shadow-lg">
                  {estabelecimento.tempoEntregaMin || '-'} - {estabelecimento.tempoEntregaMax || '-'} min
                </Text>
              </View>
            )}
            
            {/* Taxa de entrega */}
            {typeof estabelecimento.taxaEntrega === 'number' && estabelecimento.taxaEntrega > 0 && (
              <View className="flex-row items-center mr-4">
                <Ionicons name="bicycle-outline" size={16} color="#fff" />
                <Text className="text-white text-sm font-medium ml-1 shadow-lg">
                  Taxa: R$ {estabelecimento.taxaEntrega.toFixed(2).replace('.', ',')}
                </Text>
              </View>
            )}
            
            {/* Grátis se taxa for 0 */}
            {typeof estabelecimento.taxaEntrega === 'number' && estabelecimento.taxaEntrega === 0 && !estabelecimento.freteGratisAtivado && (
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                <Text className="text-white text-sm font-medium ml-1 shadow-lg">
                  Entrega grátis
                </Text>
              </View>
            )}
          </View>
          
          {/* Informação de frete grátis a partir de valor mínimo */}
          {estabelecimento.freteGratisAtivado && estabelecimento.valorMinimoFreteGratis && (
            <View className="flex-row items-center mt-2">
              <Ionicons name="gift-outline" size={16} color="#4ade80" />
              <Text className="text-green-400 text-sm font-semibold ml-1 shadow-lg">
                Frete Grátis a partir de R$ {estabelecimento.valorMinimoFreteGratis.toFixed(2).replace('.', ',')}
              </Text>
            </View>
          )}
          
          {/* Descrição do estabelecimento
          {estabelecimento.descricao && (
            <Text className="text-white text-xs mt-2 opacity-90 shadow-lg" numberOfLines={2}>
              {estabelecimento.descricao}
            </Text>
          )} */}
        </View>
      </View>

      {/* Categorias */}
      <View className="bg-white py-3 shadow-sm mb-1">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row"
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          <TouchableOpacity
            onPress={() => setSelectedCategoria(null)}
            activeOpacity={0.7}
            className={`mr-3 px-4 py-2 rounded-full items-center justify-center ${
              selectedCategoria === null
                ? 'bg-red-500'
                : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-sm ${
                selectedCategoria === null
                  ? 'text-white font-semibold'
                  : 'text-gray-700'
              }`}
            >
              Todos
            </Text>
          </TouchableOpacity>
          {categorias &&
            categorias.map((cat: any) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategoria(cat.id)}
                activeOpacity={0.7}
                className={`mr-3 px-4 py-2 rounded-full items-center justify-center ${
                  selectedCategoria === cat.id
                    ? 'bg-red-500'
                    : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`text-sm ${
                    selectedCategoria === cat.id
                      ? 'text-white font-semibold'
                      : 'text-gray-700'
                  }`}
                >
                  {cat.nome}
                </Text>
              </TouchableOpacity>
            ))}
        </ScrollView>
      </View>

      {/* Lista de produtos */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#ea1d2c" />
        </View>
      ) : error ? (
        <View className="flex-1 justify-center items-center px-4">
          <Text className="text-red-500 text-base text-center">{error}</Text>
        </View>
      ) : sections.reduce((sum, s) => sum + s.data.length, 0) === 0 ? (
        <View className="flex-1 justify-center items-center px-4">
          <Text className="text-gray-500 text-base text-center mt-8">
            Nenhum produto nesta categoria.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
          renderSectionHeader={({ section: { title, data } }) => (
            data.length > 0 ? (
              <Text className="text-lg font-bold text-gray-900 mb-2 mt-2">{title}</Text>
            ) : null
          )}
          renderItem={({ item }) => (
            <View className="bg-white rounded-xl mb-3 p-4 flex-row shadow-sm border border-gray-100">
              {item.imagem ? (
                <Image source={{ uri: item.imagem }} className="w-16 h-16 rounded-xl bg-gray-200" resizeMode="cover" />
              ) : (
                <View className="w-16 h-16 rounded-xl bg-gray-200 items-center justify-center">
                  <Ionicons name="image-outline" size={24} color="#9ca3af" />
                </View>
              )}
              <View className="flex-1 ml-3 justify-between">
                <View>
                  <Text className="text-base font-bold text-gray-900 mb-1">{item.nome}</Text>
                  {item.descricao && (
                    <Text className="text-sm text-gray-500 mb-2" numberOfLines={1}>{item.descricao}</Text>
                  )}
                  <Text className="text-lg font-semibold text-red-500">R$ {item.preco.toFixed(2).replace('.', ',')}</Text>
                </View>
                {isDono ? (
                  <TouchableOpacity onPress={() => (navigation as any).navigate('EditarProduto', { produto: item })} className="bg-blue-500 px-3 py-1.5 rounded-full self-start mt-2" activeOpacity={0.8}>
                    <Text className="text-white text-sm font-semibold">Editar</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => openModal(item)} className="bg-red-500 px-3 py-1.5 rounded-full self-start mt-2" activeOpacity={0.8}>
                    <Text className="text-white text-sm font-semibold">Adicionar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* Bottom Bar - Carrinho Fixo */}
      {qtdCart > 0 && (
        <TouchableOpacity
          onPress={() => (navigation as any).navigate('HomeTabs', { screen: 'Carrinho' })}
          className="absolute bottom-0 left-0 right-0 bg-red-500 rounded-t-3xl px-6 py-4 shadow-2xl"
          activeOpacity={0.9}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-white text-base font-bold">
                {qtdCart} {qtdCart === 1 ? 'item' : 'itens'} | R$ {totalCart.toFixed(2).replace('.', ',')}
              </Text>
              <Text className="text-white text-xs mt-0.5 opacity-90">
                Ver carrinho →
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
      )}

      {/* Modal de detalhes do produto */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm">
            {modalProduto && (
              <>
                {modalProduto.imagem ? (
                  <Image
                    source={{ uri: modalProduto.imagem }}
                    className="w-32 h-32 rounded-2xl mx-auto mb-4 bg-gray-200"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-32 h-32 rounded-2xl mx-auto mb-4 bg-gray-200 items-center justify-center">
                    <Ionicons name="image-outline" size={48} color="#9ca3af" />
                  </View>
                )}
                <Text className="text-xl font-bold text-gray-900 text-center mb-2">
                  {modalProduto.nome}
                </Text>
                {modalProduto.descricao && (
                  <Text className="text-sm text-gray-600 text-center mb-3">
                    {modalProduto.descricao}
                  </Text>
                )}
                <Text className="text-2xl font-bold text-red-500 text-center mb-4">
                  R$ {modalProduto.preco.toFixed(2).replace('.', ',')}
                </Text>
                
                {/* Controle de quantidade */}
                <View className="flex-row items-center justify-center mb-4">
                  <TouchableOpacity
                    onPress={() => setQuantidade((q) => Math.max(1, q - 1))}
                    className="bg-gray-100 rounded-full w-10 h-10 items-center justify-center"
                    activeOpacity={0.7}
                  >
                    <Ionicons name="remove" size={20} color="#ea1d2c" />
                  </TouchableOpacity>
                  <Text className="text-xl font-bold text-gray-900 mx-6 min-w-[40px] text-center">
                    {quantidade}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setQuantidade((q) => q + 1)}
                    className="bg-gray-100 rounded-full w-10 h-10 items-center justify-center"
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={20} color="#ea1d2c" />
                  </TouchableOpacity>
                </View>
                
                {/* Campo de observação */}
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-900"
                  placeholder="Observação (ex: sem cebola)"
                  placeholderTextColor="#9ca3af"
                  value={observacao}
                  onChangeText={setObservacao}
                />
                
                {/* Botão adicionar ao carrinho */}
                <TouchableOpacity
                  onPress={handleAddToCart}
                  className="bg-red-500 rounded-xl py-4 mb-3"
                  activeOpacity={0.8}
                >
                  <Text className="text-white font-bold text-center text-base">
                    Adicionar ao carrinho
                  </Text>
                </TouchableOpacity>
                
                {/* Botão fechar */}
                <Pressable onPress={closeModal}>
                  <Text className="text-red-500 font-semibold text-center text-base">
                    Fechar
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de informações do estabelecimento */}
      <Modal 
        visible={modalEstabelecimentoVisible} 
        transparent 
        animationType="slide"
        onRequestClose={() => setModalEstabelecimentoVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <Pressable 
            className="flex-1" 
            onPress={() => setModalEstabelecimentoVisible(false)}
          />
          <View className="bg-white rounded-t-3xl max-h-[85%]">
            {/* Header do modal */}
            <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200">
              <Text className="text-2xl font-bold text-gray-800">Informações do Estabelecimento</Text>
              <TouchableOpacity 
                onPress={() => {
                  setModalEstabelecimentoVisible(false);
                  setActiveTab('informacoes');
                }}
                className="bg-gray-100 rounded-full p-2"
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View className="flex-row border-b border-gray-200">
              <TouchableOpacity
                onPress={() => setActiveTab('informacoes')}
                className={`flex-1 py-4 items-center ${
                  activeTab === 'informacoes' ? 'border-b-2 border-red-600' : ''
                }`}
              >
                <Text className={`font-semibold ${
                  activeTab === 'informacoes' ? 'text-red-600' : 'text-gray-500'
                }`}>
                  Informações
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setActiveTab('avaliacoes');
                  // Sempre carregar quando mudar para a aba de avaliações
                  if (!loadingAvaliacoes) {
                    loadAvaliacoes();
                  }
                }}
                className={`flex-1 py-4 items-center ${
                  activeTab === 'avaliacoes' ? 'border-b-2 border-red-600' : ''
                }`}
              >
                <View className="flex-row items-center">
                  <Text className={`font-semibold ${
                    activeTab === 'avaliacoes' ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    Avaliações
                  </Text>
                  {estabelecimento.avaliacoesCount > 0 && (
                    <Text className={`text-xs ml-1 ${
                      activeTab === 'avaliacoes' ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      ({estabelecimento.avaliacoesCount || 0})
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            <ScrollView className="px-6 py-6" showsVerticalScrollIndicator={false}>
              {activeTab === 'informacoes' ? (
                <>

              {/* Nome */}
              <View className="mb-4">
                <Text className="text-lg font-bold text-gray-800 mb-1">Nome</Text>
                <Text className="text-base text-gray-600">{estabelecimento.nome}</Text>
              </View>

              {/* Descrição */}
              {estabelecimento.descricao && (
                <View className="mb-4">
                  <Text className="text-lg font-bold text-gray-800 mb-1">Descrição</Text>
                  <Text className="text-base text-gray-600">{estabelecimento.descricao}</Text>
                </View>
              )}

              {/* Endereço */}
              {estabelecimento.endereco && (
                <View className="mb-4">
                  <View className="flex-row items-start mb-1">
                    <Ionicons name="location-outline" size={20} color="#ea1d2c" />
                    <Text className="text-lg font-bold text-gray-800 ml-2">Endereço</Text>
                  </View>
                  <Text className="text-base text-gray-600 ml-7">{estabelecimento.endereco}</Text>
                </View>
              )}

              {/* Horários de funcionamento */}
              <View className="mb-4">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="time-outline" size={20} color="#ea1d2c" />
                  <Text className="text-lg font-bold text-gray-800 ml-2">Horários de Funcionamento</Text>
                </View>
                {estabelecimento.diasAbertos && estabelecimento.diasAbertos.length > 0 && (
                  <View className="ml-7">
                    {estabelecimento.horaAbertura && estabelecimento.horaFechamento ? (
                      <Text className="text-base text-gray-600">
                        {getDiasSemana(estabelecimento.diasAbertos)}: {estabelecimento.horaAbertura} - {estabelecimento.horaFechamento}
                      </Text>
                    ) : (
                      <Text className="text-base text-gray-600">
                        {getDiasSemana(estabelecimento.diasAbertos)}
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {/* Taxa de entrega e Frete Grátis */}
              <View className="mb-4">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="bicycle-outline" size={20} color="#ea1d2c" />
                  <Text className="text-lg font-bold text-gray-800 ml-2">Entrega</Text>
                </View>
                <View className="ml-7">
                  {typeof estabelecimento.taxaEntrega === 'number' && estabelecimento.taxaEntrega > 0 && (
                    <Text className="text-base text-gray-600 mb-1">
                      Taxa de entrega: R$ {estabelecimento.taxaEntrega.toFixed(2).replace('.', ',')}
                    </Text>
                  )}
                  {estabelecimento.tempoEntregaMin && estabelecimento.tempoEntregaMax && (
                    <Text className="text-base text-gray-600 mb-1">
                      Tempo estimado: {estabelecimento.tempoEntregaMin} - {estabelecimento.tempoEntregaMax} min
                    </Text>
                  )}
                  {estabelecimento.freteGratisAtivado && estabelecimento.valorMinimoFreteGratis ? (
                    <View className="flex-row items-center mt-2">
                      <Ionicons name="gift-outline" size={18} color="#22c55e" />
                      <Text className="text-base font-semibold text-green-600 ml-1">
                        Frete Grátis a partir de R$ {estabelecimento.valorMinimoFreteGratis.toFixed(2).replace('.', ',')}
                      </Text>
                    </View>
                  ) : estabelecimento.taxaEntrega === 0 && (
                    <View className="flex-row items-center mt-2">
                      <Ionicons name="checkmark-circle-outline" size={18} color="#22c55e" />
                      <Text className="text-base font-semibold text-green-600 ml-1">
                        Entrega grátis
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Categorias */}
              {estabelecimento.categorias && estabelecimento.categorias.length > 0 && (
                <View className="mb-4">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="pricetag-outline" size={20} color="#ea1d2c" />
                    <Text className="text-lg font-bold text-gray-800 ml-2">Categorias</Text>
                  </View>
                  <View className="ml-7 flex-row flex-wrap">
                    {estabelecimento.categorias.map((cat: any, index: number) => (
                      <View 
                        key={cat.id || index}
                        className="bg-blue-100 px-3 py-1 rounded-full mr-2 mb-2"
                      >
                        <Text className="text-blue-700 text-sm font-semibold">
                          {cat.nome}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Status */}
              <View className="mb-6">
                <View className="flex-row items-center mb-2">
                  <Ionicons 
                    name={estabelecimento.aberto ? "checkmark-circle" : "close-circle"} 
                    size={20} 
                    color={estabelecimento.aberto ? "#22c55e" : "#ef4444"} 
                  />
                  <Text className="text-lg font-bold text-gray-800 ml-2">Status</Text>
                </View>
                <View className="ml-7">
                  <View className={`px-3 py-1 rounded-full self-start ${
                    estabelecimento.aberto ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <Text className={`font-bold ${
                      estabelecimento.aberto ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {estabelecimento.aberto ? 'Aberto' : 'Fechado'}
                    </Text>
                  </View>
                </View>
              </View>
                </>
              ) : (
                <View>
                  {/* Header de Avaliações */}
                  <View className="mb-6">
                    {estabelecimento.avaliacao !== undefined && estabelecimento.avaliacao > 0 ? (
                      <View className="items-center mb-4">
                        <View className="flex-row items-center mb-2">
                          <Ionicons name="star" size={32} color="#fbbf24" />
                          <Text className="text-4xl font-bold text-gray-800 ml-2">
                            {estabelecimento.avaliacao.toFixed(1)}
                          </Text>
                        </View>
                        <Text className="text-sm text-gray-600">
                          {estabelecimento.avaliacoesCount || 0} {estabelecimento.avaliacoesCount === 1 ? 'avaliação' : 'avaliações'}
                        </Text>
                      </View>
                    ) : (
                      <View className="items-center mb-4">
                        <Ionicons name="star-outline" size={48} color="#D1D5DB" />
                        <Text className="text-base text-gray-500 mt-2">Nenhuma avaliação ainda</Text>
                      </View>
                    )}
                  </View>

                  {/* Lista de Avaliações */}
                  {errorAvaliacoes ? (
                    <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text className="text-red-800 font-semibold mb-1">
                            Erro ao carregar avaliações
                          </Text>
                          <Text className="text-red-600 text-sm">
                            {errorAvaliacoes}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            setErrorAvaliacoes(null);
                            loadAvaliacoes();
                          }}
                          className="ml-2"
                        >
                          <Ionicons name="refresh" size={20} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : loadingAvaliacoes ? (
                    <View className="py-8">
                      <ActivityIndicator size="large" color="#ea1d2c" />
                    </View>
                  ) : avaliacoes.length > 0 ? (
                    <>
                      {console.log('🎨 Renderizando', avaliacoes.length, 'avaliações')}
                      {avaliacoes.map((item) => {
                        console.log('📝 Item de avaliação:', item);
                        return (
                        <View key={item.id?.toString() || Math.random().toString()} className="bg-gray-50 rounded-xl p-4 mb-4">
                          <View className="flex-row items-center justify-between mb-2">
                            <Text className="font-bold text-base text-gray-800">
                              {item.usuario?.nome || 'Usuário Anônimo'}
                            </Text>
                            <View className="flex-row items-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Ionicons
                                  key={star}
                                  name={star <= item.nota ? 'star' : 'star-outline'}
                                  size={16}
                                  color={star <= item.nota ? '#fbbf24' : '#D1D5DB'}
                                />
                              ))}
                            </View>
                          </View>
                          {item.motivos && Array.isArray(item.motivos) && item.motivos.length > 0 && (
                            <View className="flex-row flex-wrap mb-2">
                              {item.motivos.map((motivo: string, idx: number) => (
                                <View
                                  key={idx}
                                  className="bg-orange-100 px-2 py-1 rounded-full mr-2 mb-2"
                                >
                                  <Text className="text-xs text-orange-700 font-medium">
                                    {motivo}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}
                          {item.comentario && (
                            <Text className="text-sm text-gray-600 mb-2">{item.comentario}</Text>
                          )}
                          <Text className="text-xs text-gray-400">
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            }) : ''}
                          </Text>
                        </View>
                        );
                      })}
                    </>
                  ) : (
                    <>
                      {console.log('⚠️ Nenhuma avaliação para renderizar. Estado:', {
                        avaliacoesLength: avaliacoes.length,
                        loading: loadingAvaliacoes,
                        error: errorAvaliacoes
                      })}
                      <View className="items-center py-8">
                        <Ionicons name="star-outline" size={48} color="#D1D5DB" />
                        <Text className="text-base text-gray-500 mt-4">Nenhuma avaliação ainda</Text>
                        <Text className="text-sm text-gray-400 mt-2">
                          Seja o primeiro a avaliar este estabelecimento!
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ProdutosDoEstabelecimentoScreen;

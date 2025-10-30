import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Modal, Pressable, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getProdutoByEstabelecimento } from '../services/produtoService';
import { getCurrentUser } from '../services/currentUserService';
import { useCart } from '../context/CartContext';
import { Alert } from 'react-native';



const ProdutosDoEstabelecimentoScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { estabelecimento } = route.params;
  const [isDono, setIsDono] = useState(false);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState<string | null>(null); // null = mostrar todos
  const [modalVisible, setModalVisible] = useState(false);
  const [modalProduto, setModalProduto] = useState<any | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState('');
  const { state: cartState } = useCart();

  useEffect(() => {
    const fetchProdutos = async () => {
      try {
        setLoading(true);
        const data = await getProdutoByEstabelecimento(estabelecimento.id);
        setProdutos(data);
      } catch (err) {
        setError('Erro ao carregar produtos.');
      } finally {
        setLoading(false);
      }
    };
    fetchProdutos();
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
  }, [estabelecimento.id, navigation]);

  const filtered = produtos.filter((p) => {
    if (!selectedCategoria) return true;
    if (Array.isArray(p.categorias)) {
      return p.categorias.some((cat: any) => cat.id === selectedCategoria);
    }
    return false;
  });

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
          className="absolute top-12 left-4 bg-white rounded-full p-2 shadow-lg"
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#ea1d2c" />
        </TouchableOpacity>
        
        {/* Informações do estabelecimento sobre o banner */}
        <View className="absolute bottom-4 left-4 right-4">
          <Text className="text-white text-2xl font-bold mb-2 shadow-lg">
            {estabelecimento.nome}
          </Text>
          
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
            {typeof estabelecimento.taxaEntrega === 'number' && estabelecimento.taxaEntrega === 0 && (
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                <Text className="text-white text-sm font-medium ml-1 shadow-lg">
                  Entrega grátis
                </Text>
              </View>
            )}
          </View>
          
          {/* Descrição do estabelecimento */}
          {estabelecimento.descricao && (
            <Text className="text-white text-xs mt-2 opacity-90 shadow-lg" numberOfLines={2}>
              {estabelecimento.descricao}
            </Text>
          )}
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
          {estabelecimento.categorias &&
            estabelecimento.categorias.map((cat: any) => (
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
      ) : filtered.length === 0 ? (
        <View className="flex-1 justify-center items-center px-4">
          <Text className="text-gray-500 text-base text-center mt-8">
            Nenhum produto nesta categoria.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View className="bg-white rounded-xl mb-3 p-4 flex-row shadow-sm border border-gray-100">
              {/* Imagem do produto */}
              {item.imagem ? (
                <Image
                  source={{ uri: item.imagem }}
                  className="w-16 h-16 rounded-xl bg-gray-200"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-16 h-16 rounded-xl bg-gray-200 items-center justify-center">
                  <Ionicons name="image-outline" size={24} color="#9ca3af" />
                </View>
              )}
              
              {/* Informações do produto */}
              <View className="flex-1 ml-3 justify-between">
                <View>
                  <Text className="text-base font-bold text-gray-900 mb-1">
                    {item.nome}
                  </Text>
                  {item.descricao && (
                    <Text className="text-sm text-gray-500 mb-2" numberOfLines={1}>
                      {item.descricao}
                    </Text>
                  )}
                  <Text className="text-lg font-semibold text-red-500">
                    R$ {item.preco.toFixed(2).replace('.', ',')}
                  </Text>
                </View>
                
                {/* Botão Adicionar/Editar */}
                {isDono ? (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('EditarProduto', { produto: item })}
                    className="bg-blue-500 px-3 py-1.5 rounded-full self-start mt-2"
                    activeOpacity={0.8}
                  >
                    <Text className="text-white text-sm font-semibold">
                      Editar
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => openModal(item)}
                    className="bg-red-500 px-3 py-1.5 rounded-full self-start mt-2"
                    activeOpacity={0.8}
                  >
                    <Text className="text-white text-sm font-semibold">
                      Adicionar
                    </Text>
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
          onPress={() => navigation.navigate('HomeTabs', { screen: 'Carrinho' })}
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
    </View>
  );
};

export default ProdutosDoEstabelecimentoScreen;

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { useNavigation } from '@react-navigation/native';
import { getEstabelecimentoById } from '../services/estabelecimentoService';

const SacolaScreen: React.FC = () => {
  const { state: cartState, dispatch } = useCart();
  const navigation = useNavigation();
  const [taxaEntrega, setTaxaEntrega] = useState(0);
  const [estabelecimento, setEstabelecimento] = useState<any>(null);

  const cartItems = cartState.items;

  useEffect(() => {
    if (cartItems.length > 0) {
      const estId = cartItems[0].estabelecimentoId;
      if (estId) {
        getEstabelecimentoById(String(estId)).then((est) => {
          if (est) {
            setEstabelecimento(est);
            if (est.taxaEntrega !== undefined && est.taxaEntrega !== null) {
              setTaxaEntrega(Number(est.taxaEntrega));
            }
          }
        });
      }
    } else {
      setTaxaEntrega(0);
      setEstabelecimento(null);
    }
  }, [cartItems]);

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + item.preco * item.quantidade, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal + taxaEntrega;
  };

  const handleRemoveItem = (cartItemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: cartItemId });
  };

  const handleUpdateQuantity = (cartItemId: string, change: number) => {
    const item = cartItems.find(i => i.cartItemId === cartItemId);
    if (item) {
      dispatch({ type: 'ADD_ITEM', payload: { ...item, quantidade: change } });
    }
  };

  const handleClearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const handleContinue = () => {
    if (cartItems.length === 0) {
      return;
    }
    navigation.navigate('EnderecoEntrega' as never);
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#ea1d2c" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-800">SACOLA</Text>
        {cartItems.length > 0 && (
          <TouchableOpacity onPress={handleClearCart}>
            <Text className="text-base text-red-600 font-semibold">Limpar</Text>
          </TouchableOpacity>
        )}
        {cartItems.length === 0 && <View className="w-12" />}
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Restaurant Info */}
        {estabelecimento && (
          <View className="px-4 py-4 bg-white">
            <View className="flex-row items-center">
              {estabelecimento?.imagem ? (
                <Image
                  source={{ uri: estabelecimento.imagem }}
                  className="w-12 h-12 rounded-full mr-3 bg-gray-100"
                />
              ) : (
                <View className="w-12 h-12 rounded-full bg-amber-100 justify-center items-center mr-3">
                  <Text className="text-xs font-bold text-amber-900 text-center">
                    {estabelecimento?.nome?.toUpperCase().substring(0, 3) || 'EST'}
                  </Text>
                </View>
              )}
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-800 mb-1">{estabelecimento?.nome || 'Estabelecimento'}</Text>
                <TouchableOpacity onPress={() => estabelecimento && (navigation as any).navigate('ProdutosDoEstabelecimento', { estabelecimento })}>
                  <Text className="text-sm text-red-600 font-semibold">Adicionar mais itens</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Added Items */}
        {cartItems.length > 0 && (
          <View className="px-4 py-4 bg-white">
            <Text className="text-lg font-bold text-gray-800 mb-3">Itens adicionados</Text>
            {cartItems.map((item) => (
              <View key={item.cartItemId} className="flex-row items-center bg-gray-50 rounded-xl p-3 mb-3 border border-gray-200">
                <Image 
                  source={{ uri: (item as any).imagem || 'https://via.placeholder.com/80x80' }} 
                  className="w-15 h-15 rounded-lg mr-3 bg-gray-100"
                />
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-800 mb-1">{item.nome}</Text>
                  {!!item.observacao && (
                    <Text className="text-xs text-gray-500 mb-1">Obs.: {item.observacao}</Text>
                  )}
                  <Text className="text-sm font-bold text-red-600">R$ {item.preco.toFixed(2)}</Text>
                </View>
                <View className="flex-row items-center bg-white rounded-lg px-2 py-1 border border-gray-200">
                  <TouchableOpacity 
                    className="w-6 h-6 justify-center items-center"
                    onPress={() => item.quantidade === 1 ? handleRemoveItem(item.cartItemId) : handleUpdateQuantity(item.cartItemId, -1)}
                  >
                    {item.quantidade === 1 ? (
                      <Ionicons name="trash-outline" size={16} color="#ea1d2c" />
                    ) : (
                      <Text className="text-base font-bold text-red-600">-</Text>
                    )}
                  </TouchableOpacity>
                  <Text className="text-base font-semibold text-gray-800 mx-2 min-w-[20px] text-center">{item.quantidade}</Text>
                  <TouchableOpacity 
                    className="w-6 h-6 justify-center items-center"
                    onPress={() => handleUpdateQuantity(item.cartItemId, 1)}
                  >
                    <Text className="text-base font-bold text-red-600">+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {estabelecimento && (
              <TouchableOpacity 
                className="mt-2"
                onPress={() => (navigation as any).navigate('ProdutosDoEstabelecimento', { estabelecimento })}
              >
                <Text className="text-sm text-red-600 font-semibold">Adicionar mais itens</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Empty State */}
        {cartItems.length === 0 && (
          <View className="flex-1 justify-center items-center py-20 px-4">
            <Ionicons name="cart-outline" size={64} color="#ccc" />
            <Text className="text-gray-500 text-base mt-4 text-center">Seu carrinho está vazio</Text>
            <Text className="text-gray-400 text-sm mt-2 text-center">Adicione itens ao carrinho para continuar</Text>
          </View>
        )}

        {/* Value Summary */}
        {cartItems.length > 0 && (
          <View className="px-4 py-4 bg-white">
            <Text className="text-lg font-bold text-gray-800 mb-3">Resumo de valores</Text>
            <View className="flex-row justify-between items-center py-1.5">
              <Text className="text-base text-gray-600 font-medium">Subtotal</Text>
              <Text className="text-base text-gray-800 font-semibold">R$ {calculateSubtotal().toFixed(2)}</Text>
            </View>
            <View className="flex-row justify-between items-center py-1.5">
              <Text className="text-base text-gray-600 font-medium">Taxa de entrega</Text>
              <Text className="text-base text-gray-800 font-semibold">R$ {taxaEntrega.toFixed(2)}</Text>
            </View>
            <View className="flex-row justify-between items-center py-3 mt-2 border-t border-gray-300">
              <Text className="text-lg font-bold text-gray-800">Total</Text>
              <Text className="text-lg font-bold text-red-600">R$ {calculateTotal().toFixed(2)}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      {cartItems.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-8">
          <View className="flex-row items-center px-4 py-4">
            <View className="flex-1">
              <Text className="text-sm text-gray-600 mb-1">Total com a entrega</Text>
              <Text className="text-lg font-bold text-gray-800">
                R$ {calculateTotal().toFixed(2)} / {cartItems.length} item{cartItems.length > 1 ? 's' : ''}
              </Text>
            </View>
            <TouchableOpacity
              className={`rounded-xl py-4 px-6 min-w-[120px] items-center ${
                cartItems.length === 0 ? 'bg-gray-300' : 'bg-red-600'
              }`}
              onPress={handleContinue}
              disabled={cartItems.length === 0}
              activeOpacity={0.8}
            >
              <Text className="text-white text-base font-bold">Continuar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

export default SacolaScreen;

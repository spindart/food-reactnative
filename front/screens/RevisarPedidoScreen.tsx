import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCart } from '../context/CartContext';
import { createOrder } from '../services/orderService';
import { getCurrentUser } from '../services/currentUserService';
import { iniciarPagamentoPix } from '../services/pixService';
import { getUsuarioById } from '../services/usuarioService';
import { generateCardToken, createCardPayment, createPaymentWithSavedCard } from '../services/cardPaymentService';
import CardManagementService from '../services/cardManagementService';

const RevisarPedidoScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { state: cartState, dispatch } = useCart();
  
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  
  const {
    endereco,
    opcaoEntrega,
    formaPagamento,
    cartaoSelecionado,
    usarCartaoSalvo,
    savedCardCvv,
    cardNumber,
    cardName,
    cardExp,
    cardCvv,
    formaPagamentoEntrega,
    precisaTroco,
    trocoParaQuanto
  } = route.params || {};

  const cartItems = cartState.items;

  useEffect(() => {
    getCurrentUser().then(async (user) => {
      setUserId(user?.id ? String(user.id) : null);
      
      if (user?.id) {
        try {
          const userCompleteData = await getUsuarioById(String(user.id));
          setUserData(userCompleteData);
        } catch (error) {
          console.log('Erro ao carregar dados do usuário:', error);
        }
      }
    });
  }, []);

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + item.preco * item.quantidade, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const taxaEntrega = opcaoEntrega === 'retirada' ? 0 : (route.params?.taxaEntrega || 0);
    return subtotal + taxaEntrega;
  };

  const formatPaymentMethod = () => {
    if (formaPagamento === 'dinheiro') {
      return `${formaPagamentoEntrega === 'dinheiro' ? 'Dinheiro' : formaPagamentoEntrega === 'debito' ? 'Cartão de Débito' : 'Cartão de Crédito'}${precisaTroco ? ` (Troco para R$ ${trocoParaQuanto})` : ''}`;
    } else if (formaPagamento === 'cartao') {
      if (usarCartaoSalvo && cartaoSelecionado) {
        return `${cartaoSelecionado.paymentMethodId.toUpperCase()} ****${cartaoSelecionado.lastFourDigits}`;
      } else {
        return `Cartão ****${cardNumber?.slice(-4) || '****'}`;
      }
    } else if (formaPagamento === 'pix') {
      return 'PIX';
    }
    return 'Não selecionado';
  };

  const handleConfirmOrder = async () => {
    if (!userId || cartItems.length === 0) {
      Alert.alert('Erro', 'Dados insuficientes para criar o pedido');
      return;
    }

    setLoading(true);
    
    try {
      const estabelecimentoId = cartItems[0].estabelecimentoId;
      
      if (!estabelecimentoId) {
        Alert.alert('Erro', 'Estabelecimento não identificado');
        return;
      }

      if (formaPagamento === 'pix') {
        const pixResp = await iniciarPagamentoPix({
          amount: calculateTotal(),
          description: `Pedido em ${estabelecimentoId}`,
          payerEmail: userData?.email || 'usuario@exemplo.com',
          payerFirstName: userData?.nome?.split(' ')[0] || 'Usuario',
          payerLastName: userData?.nome?.split(' ').slice(1).join(' ') || 'Teste',
          payerCpf: '19119119100',
          payerAddress: {
            zip_code: '06233200',
            street_name: 'Av. das Nações Unidas',
            street_number: '3003',
            neighborhood: 'Bonfim',
            city: 'Osasco',
            federal_unit: 'SP'
          },
        });
        
        (navigation as any).navigate('PixPaymentConfirmation', {
          pixData: pixResp,
          orderData: {
            userId,
            estabelecimentoId,
            cartItems,
            total: calculateTotal(),
            endereco: endereco?.address || endereco,
            taxaEntrega: opcaoEntrega === 'retirada' ? 0 : (route.params?.taxaEntrega || 0)
          }
        });
        return;
      }

      if (formaPagamento === 'cartao') {
        let paymentResult;
        
        try {
          if (usarCartaoSalvo && cartaoSelecionado) {
            console.log('💳 Processando pagamento com cartão salvo...');
            
            if (!savedCardCvv) {
              Alert.alert('Erro', 'CVV do cartão é obrigatório');
              return;
            }

            const user = await getCurrentUser();
            if (!user?.id) {
              throw new Error('Usuário não encontrado');
            }

            const usuarioCompleto = await getUsuarioById(String(user.id));
            if (!usuarioCompleto.mercadoPagoCustomerId) {
              throw new Error('Usuário não possui customer ID do MercadoPago');
            }

            paymentResult = await createPaymentWithSavedCard({
              amount: calculateTotal(),
              description: `Pedido em ${estabelecimentoId}`,
              payerEmail: userData?.email || '',
              customerId: usuarioCompleto.mercadoPagoCustomerId,
              cardId: cartaoSelecionado.id.toString(),
              securityCode: savedCardCvv,
              installments: 1,
              paymentMethodId: cartaoSelecionado.paymentMethodId
            });
          } else {
            console.log('💳 Processando pagamento com cartão novo...');
            
            if (!cardNumber || !cardName || !cardExp || !cardCvv) {
              Alert.alert('Erro', 'Dados do cartão incompletos');
              return;
            }

            const token = await generateCardToken({
              cardNumber,
              cardExp,
              cardCvv,
              cardName
            });

            const paymentMethodId = CardManagementService.detectCardBrand(cardNumber);

            paymentResult = await createCardPayment({
              amount: calculateTotal(),
              description: `Pedido em ${estabelecimentoId}`,
              payerEmail: userData?.email || '',
              token,
              installments: 1,
              paymentMethodId,
              cardNumber
            });
          }

          if (paymentResult.status === 'approved' || paymentResult.status === 'pending') {
            console.log('✅ Pagamento processado:', paymentResult.paymentId);
            
            const payload = {
              clienteId: Number(userId),
              estabelecimentoId: Number(estabelecimentoId),
              produtos: cartItems.map((item) => ({
                produtoId: Number(item.id),
                quantidade: item.quantidade
              })),
              formaPagamento: 'cartao',
              total: calculateTotal(),
              paymentId: paymentResult.paymentId,
              paymentStatus: paymentResult.status,
              paymentMethod: 'credit_card',
              enderecoEntrega: endereco?.address || endereco,
            };
            
            console.log('Criando pedido com payload:', payload);
            const response = await createOrder(payload);
            console.log('Pedido criado com sucesso:', response);
            
            dispatch({ type: 'CLEAR_CART' });
            
            Alert.alert(
              'Pedido Confirmado!', 
              'Seu pedido foi realizado com sucesso e está sendo preparado.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    (navigation as any).navigate('HomeTabs', { screen: 'Pedidos' });
                  }
                }
              ]
            );
          } else {
            throw new Error(`Pagamento não foi aprovado. Status: ${paymentResult.status}`);
          }
        } catch (paymentError: any) {
          console.error('Erro ao processar pagamento:', paymentError);
          Alert.alert(
            'Erro no Pagamento',
            paymentError.message || 'Não foi possível processar o pagamento. Tente novamente.'
          );
          return;
        }
        
        return;
      }

      const payload = {
        clienteId: Number(userId),
        estabelecimentoId: Number(estabelecimentoId),
        produtos: cartItems.map((item) => ({
          produtoId: Number(item.id),
          quantidade: item.quantidade
        })),
        formaPagamento: formaPagamento || 'dinheiro',
        total: calculateTotal(),
        formaPagamentoEntrega: formaPagamentoEntrega,
        precisaTroco: precisaTroco,
        trocoParaQuanto: precisaTroco ? parseFloat(trocoParaQuanto || '0') : undefined,
        enderecoEntrega: endereco?.address || endereco,
      };
      
      console.log('Criando pedido com payload:', payload);
      
      const response = await createOrder(payload);
      console.log('Pedido criado com sucesso:', response);
      
      dispatch({ type: 'CLEAR_CART' });
      
      Alert.alert(
        'Pedido Confirmado!', 
        'Seu pedido foi realizado com sucesso e está sendo preparado.',
        [
          {
            text: 'OK',
            onPress: () => {
              (navigation as any).navigate('HomeTabs', { screen: 'Pedidos' });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      Alert.alert('Erro', 'Não foi possível confirmar o pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeOrder = () => {
    navigation.goBack();
  };

  return (
    <View className="flex-1 bg-gray-100">
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#ea1d2c" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-800">SACOLA</Text>
        <View className="w-6" />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Modal de revisão */}
        <View className="bg-white m-4 rounded-2xl p-6 shadow-lg">
          <Text className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Revise o seu pedido
          </Text>
          
          {/* Entrega */}
          <View className="flex-row items-center py-4 border-b border-gray-200">
            <Text className="text-xl mr-4">🏍️</Text>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-800 mb-1">Entrega hoje</Text>
              <Text className="text-sm text-gray-600">Hoje, 70 - 80 min</Text>
            </View>
          </View>

          {/* Endereço */}
          <View className="flex-row items-center py-4 border-b border-gray-200">
            <Text className="text-xl mr-4">📍</Text>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-800 mb-1">{endereco?.address || 'Endereço não selecionado'}</Text>
              <Text className="text-sm text-gray-600">{endereco?.label || 'Endereço'}</Text>
            </View>
          </View>

          {/* Pagamento */}
          <View className="flex-row items-center py-4">
            <Text className="text-xl mr-4">
              {formaPagamento === 'pix' ? '📱' : formaPagamento === 'cartao' ? '💳' : '💵'}
            </Text>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-800 mb-1">Pagamento pelo app</Text>
              <Text className="text-sm text-gray-600">{formatPaymentMethod()}</Text>
            </View>
            <Text className="text-base font-bold text-gray-800">R$ {calculateTotal().toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-8 pt-4 px-4">
        <TouchableOpacity
          className={`bg-red-600 rounded-xl py-4 items-center mb-3 ${
            loading ? 'opacity-70' : ''
          }`}
          onPress={handleConfirmOrder}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-lg font-bold">
              Fazer pedido
            </Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          className="items-center py-2"
          onPress={handleChangeOrder}
          activeOpacity={0.8}
        >
          <Text className="text-red-600 text-base font-semibold">Alterar pedido</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RevisarPedidoScreen;


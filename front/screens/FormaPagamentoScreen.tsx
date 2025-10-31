import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getCurrentUser } from '../services/currentUserService';
import { getCartoes, Cartao, adicionarCartao } from '../services/cartaoService';
import { useCart } from '../context/CartContext';
import { getEstabelecimentoById } from '../services/estabelecimentoService';
import { generateCardToken } from '../services/cardPaymentService';

const FormaPagamentoScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { state: cartState } = useCart();
  const [formaPagamento, setFormaPagamento] = useState<'dinheiro' | 'cartao' | 'pix' | null>(null);
  const [taxaEntrega, setTaxaEntrega] = useState(0);
  const [estabelecimento, setEstabelecimento] = useState<any>(null);
  const [cartoesSalvos, setCartoesSalvos] = useState<Cartao[]>([]);
  const [cartaoSelecionado, setCartaoSelecionado] = useState<Cartao | null>(null);
  const [usarCartaoSalvo, setUsarCartaoSalvo] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showCardSelectionModal, setShowCardSelectionModal] = useState(false);
  const [savedCardCvv, setSavedCardCvv] = useState('');
  
  // Estados para novo cartão
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardError, setCardError] = useState('');
  const [savingCard, setSavingCard] = useState(false);
  
  // Estados para pagamento na entrega
  const [showDeliveryPaymentModal, setShowDeliveryPaymentModal] = useState(false);
  const [formaPagamentoEntrega, setFormaPagamentoEntrega] = useState<string>('');
  const [precisaTroco, setPrecisaTroco] = useState(false);
  const [trocoParaQuanto, setTrocoParaQuanto] = useState<string>('');

  useEffect(() => {
    loadCartoesSalvos();
    loadTaxaEntrega();
  }, [cartState.items]);

  const loadTaxaEntrega = () => {
    if (cartState.items.length > 0) {
      const estId = cartState.items[0].estabelecimentoId;
      if (estId) {
        getEstabelecimentoById(String(estId)).then((est) => {
          if (est) {
            setEstabelecimento(est);
            const subtotal = cartState.items.reduce((total, item) => total + item.preco * item.quantidade, 0);
            let taxa = est.taxaEntrega || 0;
            
            // Verificar se frete grátis está ativado e se o subtotal atinge o valor mínimo
            if (est.freteGratisAtivado && est.valorMinimoFreteGratis && subtotal >= est.valorMinimoFreteGratis) {
              taxa = 0;
            }
            
            setTaxaEntrega(taxa);
          }
        });
      }
    }
  };

  const calculateTaxaEntrega = () => {
    if (!estabelecimento || route.params?.opcaoEntrega === 'retirada') {
      return route.params?.taxaEntrega || 0;
    }
    
    const subtotal = cartState.items.reduce((total, item) => total + item.preco * item.quantidade, 0);
    
    // Verificar se frete grátis está ativado e se o subtotal atinge o valor mínimo
    if (estabelecimento.freteGratisAtivado && estabelecimento.valorMinimoFreteGratis && subtotal >= estabelecimento.valorMinimoFreteGratis) {
      return 0;
    }
    
    return estabelecimento.taxaEntrega || 0;
  };

  const loadCartoesSalvos = async () => {
    try {
      const user = await getCurrentUser();
      if (user?.id) {
        const cartoes = await getCartoes(user.id);
        setCartoesSalvos(cartoes);
        
        // Definir cartão padrão se existir
        if (cartoes.length > 0) {
          const cartaoPadrao = cartoes.find(c => c.isDefault) || cartoes[0];
          setCartaoSelecionado(cartaoPadrao);
          setUsarCartaoSalvo(true);
        }
      }
    } catch (error) {
      console.log('Erro ao carregar cartões salvos:', error);
    }
  };

  const formatCardExp = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    const limited = numbers.substring(0, 4);
    
    if (limited.length >= 2) {
      const month = limited.substring(0, 2);
      const year = limited.substring(2);
      
      if (month.length === 2) {
        const monthNum = parseInt(month, 10);
        if (monthNum > 12) {
          return '12/' + year;
        }
        if (monthNum === 0) {
          return '01/' + year;
        }
      }
      
      return month + '/' + year;
    }
    return limited;
  };

  const handlePaymentMethodSelect = (method: 'dinheiro' | 'cartao' | 'pix') => {
    setFormaPagamento(method);
    
    if (method === 'dinheiro') {
      setShowDeliveryPaymentModal(true);
    } else if (method === 'cartao') {
      // Se já tem cartão selecionado, usando cartão salvo e já temos CVV nesta sessão, não abrir modal
      if (cartaoSelecionado && usarCartaoSalvo && savedCardCvv) {
        // Já está tudo configurado, não precisa abrir modal
        return;
      }
      
      if (cartoesSalvos.length > 0) {
        setShowCardSelectionModal(true);
      } else {
        setShowCardModal(true);
      }
    }
  };

  const calculateTotal = () => {
    const subtotal = cartState.items.reduce((total, item) => total + item.preco * item.quantidade, 0);
    return subtotal + taxaEntrega;
  };

  const handleConfirmDeliveryPayment = () => {
    if (!formaPagamentoEntrega) {
      Alert.alert('Erro', 'Selecione uma forma de pagamento');
      return;
    }

    if (formaPagamentoEntrega === 'dinheiro' && precisaTroco) {
      const trocoValue = parseFloat(trocoParaQuanto);
      
      if (isNaN(trocoValue) || trocoValue <= 0) {
        Alert.alert('Erro', 'Digite um valor válido para o troco');
        return;
      }
    }

    setShowDeliveryPaymentModal(false);
    Alert.alert('Sucesso', `Pagamento na entrega: ${formaPagamentoEntrega === 'dinheiro' ? 'Dinheiro' : formaPagamentoEntrega === 'debito' ? 'Cartão de Débito' : 'Cartão de Crédito'}${precisaTroco ? ` (Troco para R$ ${trocoParaQuanto})` : ''}`);
  };

  const handleContinue = () => {
    if (!formaPagamento) {
      Alert.alert('Atenção', 'Selecione uma forma de pagamento');
      return;
    }

    if (formaPagamento === 'cartao' && !usarCartaoSalvo && (!cardNumber || !cardName || !cardExp || !cardCvv)) {
      Alert.alert('Atenção', 'Preencha todos os dados do cartão');
      return;
    }

    if (formaPagamento === 'cartao' && usarCartaoSalvo && !savedCardCvv) {
      // Se tem cartão selecionado mas não tem CVV, abrir modal de seleção
      if (cartaoSelecionado) {
        setShowCardSelectionModal(true);
      } else {
        Alert.alert('Atenção', 'Selecione um cartão primeiro');
      }
      return;
    }

    // Passar dados para próxima tela
    (navigation as any).navigate('RevisarPedido', {
      ...route.params,
      taxaEntrega: calculateTaxaEntrega(),
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
    });
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#ea1d2c" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-800">SACOLA</Text>
        <View className="w-6" />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Forma de pagamento */}
        <View className="px-4 py-4 bg-white border-b border-gray-200">
          <Text className="text-lg font-bold text-gray-800 mb-3">Forma de pagamento</Text>
          
          <View className="flex-row gap-3">
            <TouchableOpacity 
              className={`flex-1 rounded-xl py-4 px-3 items-center border ${
                formaPagamento === 'dinheiro' 
                  ? 'bg-red-600 border-red-600' 
                  : 'bg-gray-50 border-gray-200'
              }`}
              onPress={() => handlePaymentMethodSelect('dinheiro')}
              activeOpacity={0.8}
            >
              <Text className={`text-sm font-semibold text-center ${
                formaPagamento === 'dinheiro' ? 'text-white' : 'text-gray-800'
              }`}>
                💵 Pagar na entrega
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className={`flex-1 rounded-xl py-4 px-3 items-center border ${
                formaPagamento === 'cartao' 
                  ? 'bg-red-600 border-red-600' 
                  : 'bg-gray-50 border-gray-200'
              }`}
              onPress={() => handlePaymentMethodSelect('cartao')}
              activeOpacity={0.8}
            >
              <Text className={`text-sm font-semibold text-center ${
                formaPagamento === 'cartao' ? 'text-white' : 'text-gray-800'
              }`}>
                💳 Cartão
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className={`flex-1 rounded-xl py-4 px-3 items-center border ${
                formaPagamento === 'pix' 
                  ? 'bg-red-600 border-red-600' 
                  : 'bg-gray-50 border-gray-200'
              }`}
              onPress={() => handlePaymentMethodSelect('pix')}
              activeOpacity={0.8}
            >
              <Text className={`text-sm font-semibold text-center ${
                formaPagamento === 'pix' ? 'text-white' : 'text-gray-800'
              }`}>
                📱 PIX
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cupom */}
        {/* <View style={styles.section}>
          <View style={styles.couponSection}>
            <View style={styles.couponInfo}>
              <Text style={styles.couponIcon}>🎫</Text>
              <View style={styles.couponDetails}>
                <Text style={styles.couponTitle}>Cupom</Text>
                <Text style={styles.couponDescription}>1 do Clube para usar nessa loja</Text>
              </View>
            </View>
            <TouchableOpacity>
              <Text style={styles.addCouponButton}>Adicionar</Text>
            </TouchableOpacity>
          </View>
        </View> */}

        {/* Doação */}
        {/* <View style={styles.section}>
          <View style={styles.donationSection}>
            <View style={styles.donationHeader}>
              <Text style={styles.donationTitle}>Doe para o Teleton</Text>
              <TouchableOpacity>
                <Text style={styles.helpIcon}>?</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.donationDescription}>
              Opção disponível apenas para pagamentos no cartão de crédito à vista
            </Text>
          </View>
        </View> */}

        {/* Resumo de valores */}
        <View className="px-4 py-4 bg-white border-b border-gray-200">
          <Text className="text-lg font-bold text-gray-800 mb-3">Resumo de valores</Text>
          <View className="flex-row justify-between items-center py-1.5">
            <Text className="text-base text-gray-600 font-medium">Subtotal</Text>
            <Text className="text-base text-gray-800 font-semibold">R$ {cartState.items.reduce((total, item) => total + item.preco * item.quantidade, 0).toFixed(2)}</Text>
          </View>
          <View className="flex-row justify-between items-center py-1.5">
            <Text className="text-base text-gray-600 font-medium">Taxa de entrega</Text>
            <View className="items-end">
              {estabelecimento?.freteGratisAtivado && estabelecimento?.valorMinimoFreteGratis && cartState.items.reduce((total, item) => total + item.preco * item.quantidade, 0) >= estabelecimento.valorMinimoFreteGratis ? (
                <>
                  <Text className="text-base text-green-600 font-semibold">Grátis</Text>
                  <Text className="text-xs text-gray-500 line-through">R$ {(estabelecimento.taxaEntrega || 0).toFixed(2)}</Text>
                </>
              ) : (
                <Text className="text-base text-gray-800 font-semibold">R$ {calculateTaxaEntrega().toFixed(2)}</Text>
              )}
            </View>
          </View>
          <View className="flex-row justify-between items-center py-3 mt-2 border-t border-gray-300">
            <Text className="text-lg font-bold text-gray-800">Total</Text>
            <Text className="text-lg font-bold text-red-600">R$ {(cartState.items.reduce((total, item) => total + item.preco * item.quantidade, 0) + calculateTaxaEntrega()).toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-8">
        <TouchableOpacity
          className="bg-red-600 rounded-xl py-4 mx-4 my-4 items-center"
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text className="text-white text-base font-bold">
            Revisar pedido • R$ {(cartState.items.reduce((total, item) => total + item.preco * item.quantidade, 0) + calculateTaxaEntrega()).toFixed(2)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal de Pagamento na Entrega */}
      <Modal visible={showDeliveryPaymentModal} transparent animationType="slide">
        <View className="flex-1 bg-black/40 justify-center items-center">
          <View className="bg-white rounded-2xl p-6 w-[90%] max-h-[80%]">
            <Text className="font-bold text-lg mb-2 text-red-600">Pagamento na Entrega</Text>
            <Text className="text-sm text-gray-600 mb-5">
              Selecione como deseja pagar na entrega:
            </Text>
            
            <View className="mb-5">
              <TouchableOpacity 
                className={`bg-gray-50 border rounded-xl py-4 px-5 mb-3 items-center ${
                  formaPagamentoEntrega === 'dinheiro' ? 'bg-red-600 border-red-600' : 'border-gray-200'
                }`}
                onPress={() => setFormaPagamentoEntrega('dinheiro')}
                activeOpacity={0.8}
              >
                <Text className={`text-base font-semibold ${
                  formaPagamentoEntrega === 'dinheiro' ? 'text-white' : 'text-gray-800'
                }`}>
                  💵 Dinheiro
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className={`bg-gray-50 border rounded-xl py-4 px-5 mb-3 items-center ${
                  formaPagamentoEntrega === 'debito' ? 'bg-red-600 border-red-600' : 'border-gray-200'
                }`}
                onPress={() => setFormaPagamentoEntrega('debito')}
                activeOpacity={0.8}
              >
                <Text className={`text-base font-semibold ${
                  formaPagamentoEntrega === 'debito' ? 'text-white' : 'text-gray-800'
                }`}>
                  💳 Cartão de Débito
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className={`bg-gray-50 border rounded-xl py-4 px-5 mb-3 items-center ${
                  formaPagamentoEntrega === 'credito' ? 'bg-red-600 border-red-600' : 'border-gray-200'
                }`}
                onPress={() => setFormaPagamentoEntrega('credito')}
                activeOpacity={0.8}
              >
                <Text className={`text-base font-semibold ${
                  formaPagamentoEntrega === 'credito' ? 'text-white' : 'text-gray-800'
                }`}>
                  💳 Cartão de Crédito
                </Text>
              </TouchableOpacity>
            </View>

            {/* Opções de troco para dinheiro */}
            {formaPagamentoEntrega === 'dinheiro' && (
              <View className="mb-5">
                <Text className="text-base font-semibold mb-3 text-gray-800">Precisa de troco?</Text>
                
                <TouchableOpacity 
                  className={`bg-gray-50 border rounded-lg py-3 px-4 mb-2 items-center ${
                    precisaTroco ? 'bg-red-600 border-red-600' : 'border-gray-200'
                  }`}
                  onPress={() => setPrecisaTroco(true)}
                  activeOpacity={0.8}
                >
                  <Text className={`text-sm font-semibold ${
                    precisaTroco ? 'text-white' : 'text-gray-800'
                  }`}>Sim</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  className={`bg-gray-50 border rounded-lg py-3 px-4 mb-2 items-center ${
                    !precisaTroco ? 'bg-red-600 border-red-600' : 'border-gray-200'
                  }`}
                  onPress={() => setPrecisaTroco(false)}
                  activeOpacity={0.8}
                >
                  <Text className={`text-sm font-semibold ${
                    !precisaTroco ? 'text-white' : 'text-gray-800'
                  }`}>Não</Text>
                </TouchableOpacity>

                {precisaTroco && (
                  <View className="mt-3">
                    <Text className="text-sm text-gray-600 mb-2">Troco para quanto?</Text>
                    <TextInput
                      className="border border-gray-200 rounded-lg py-3 px-4 text-base bg-white mb-2 text-gray-800"
                      placeholder="Ex: 50.00"
                      placeholderTextColor="#aaa"
                      value={trocoParaQuanto}
                      onChangeText={setTrocoParaQuanto}
                      keyboardType="numeric"
                    />
                    <Text className="text-xs text-gray-600">
                      Total do pedido: R$ {calculateTotal().toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View className="flex-row justify-between mt-4 gap-2">
              <TouchableOpacity
                className="flex-1 bg-gray-50 border border-gray-200 py-3 rounded-lg items-center justify-center"
                onPress={() => {
                  setFormaPagamentoEntrega('');
                  setPrecisaTroco(false);
                  setTrocoParaQuanto('');
                  setShowDeliveryPaymentModal(false);
                }}
                activeOpacity={0.8}
              >
                <Text className="text-gray-600 text-base font-medium">Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className={`flex-1 py-3 rounded-lg items-center justify-center ${
                  formaPagamentoEntrega ? 'bg-red-600' : 'bg-gray-300'
                }`}
                onPress={handleConfirmDeliveryPayment}
                disabled={!formaPagamentoEntrega}
                activeOpacity={0.8}
              >
                <Text className={`text-base font-bold ${
                  formaPagamentoEntrega ? 'text-white' : 'text-gray-600'
                }`}>
                  {formaPagamentoEntrega ? 'Confirmar' : 'Selecione uma opção'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Seleção de Cartões Salvos */}
      <Modal visible={showCardSelectionModal} transparent animationType="slide">
        <View className="flex-1 bg-black/40 justify-center items-center">
          <View className="bg-white rounded-2xl p-6 w-[90%] max-h-[80%]">
            <Text className="font-bold text-lg mb-4 text-red-600">Selecionar Cartão</Text>
            
            {cartoesSalvos.length > 0 ? (
              <>
                {cartoesSalvos.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    className={`flex-row justify-between items-center p-4 mb-2 rounded-lg border ${
                      cartaoSelecionado?.id === item.id 
                        ? 'border-red-600 bg-red-50' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                    onPress={() => setCartaoSelecionado(item)}
                    activeOpacity={0.8}
                  >
                    <View className="flex-1">
                      <Text className="text-base font-bold text-gray-800">{item.paymentMethodId.toUpperCase()}</Text>
                      <Text className="text-sm text-gray-600 mt-0.5">****{item.lastFourDigits}</Text>
                      <Text className="text-xs text-gray-500 mt-0.5">
                        {item.expirationMonth.toString().padStart(2, '0')}/{item.expirationYear.toString().slice(-2)}
                      </Text>
                    </View>
                    {item.isDefault && (
                      <Text className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">PADRÃO</Text>
                    )}
                  </TouchableOpacity>
                ))}
                
                {/* Campo CVV para cartão salvo */}
                {cartaoSelecionado && (
                  <View className="mt-4">
                    <Text className="text-base font-bold mb-2 text-gray-800">Código de Segurança (CVV)</Text>
                    <TextInput
                      className="border border-gray-300 rounded-lg p-3 text-base bg-white mb-2 text-gray-800"
                      placeholder="Digite o CVV"
                      placeholderTextColor="#aaa"
                      value={savedCardCvv}
                      onChangeText={setSavedCardCvv}
                      keyboardType="numeric"
                      maxLength={4}
                      secureTextEntry
                    />
                    <Text className="text-xs text-gray-600">
                      Por segurança, precisamos do CVV para processar o pagamento
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View className="p-5 items-center">
                <Text className="text-gray-600 text-base mb-4">
                  Nenhum cartão salvo encontrado
                </Text>
                <Text className="text-gray-400 text-sm text-center">
                  Adicione um cartão para facilitar seus pagamentos futuros
                </Text>
              </View>
            )}
            
            <View className="flex-row justify-between mt-4 gap-2">
              <TouchableOpacity
                className="flex-1 bg-gray-50 border border-gray-200 py-3 rounded-lg items-center justify-center"
                onPress={() => {
                  setUsarCartaoSalvo(false);
                  setShowCardSelectionModal(false);
                  setShowCardModal(true);
                }}
                activeOpacity={0.8}
              >
                <Text className="text-gray-600 text-base font-medium">Adicionar Novo Cartão</Text>
              </TouchableOpacity>
              
              {cartaoSelecionado && (
                <TouchableOpacity
                  className={`flex-1 py-3 rounded-lg items-center justify-center ${
                    savedCardCvv ? 'bg-red-600' : 'bg-gray-300'
                  }`}
                  onPress={() => {
                    if (!savedCardCvv) {
                      Alert.alert('Erro', 'Digite o CVV do cartão');
                      return;
                    }
                    setUsarCartaoSalvo(true);
                    setFormaPagamento('cartao');
                    setShowCardSelectionModal(false);
                  }}
                  disabled={!savedCardCvv}
                  activeOpacity={0.8}
                >
                  <Text className="text-white text-base font-bold">
                    Usar Cartão Selecionado
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity 
              className="mt-2 self-center"
              onPress={() => {
                setShowCardSelectionModal(false);
                if (!savedCardCvv) {
                  setUsarCartaoSalvo(false);
                  setCartaoSelecionado(null);
                }
              }}
              activeOpacity={0.8}
            >
              <Text className="text-red-600 font-bold">Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Novo Cartão */}
      <Modal visible={showCardModal} transparent animationType="slide">
        <View className="flex-1 bg-black/40 justify-center items-center">
          <View className="bg-white rounded-2xl p-6 w-[90%] max-h-[80%]">
            <Text className="font-bold text-lg mb-4 text-red-600">Pagamento com Cartão</Text>
            
            <TextInput 
              className="border border-gray-200 rounded-lg py-3 px-4 text-base bg-gray-50 mb-3 text-gray-800"
              placeholder="Número do cartão" 
              placeholderTextColor="#aaa"
              keyboardType="numeric" 
              value={cardNumber} 
              onChangeText={setCardNumber} 
              maxLength={19} 
            />
            <TextInput 
              className="border border-gray-200 rounded-lg py-3 px-4 text-base bg-gray-50 mb-3 text-gray-800"
              placeholder="Nome impresso no cartão"
              placeholderTextColor="#aaa"
              value={cardName} 
              onChangeText={setCardName} 
            />
            <View className="flex-row gap-3">
              <TextInput 
                className="flex-1 border border-gray-200 rounded-lg py-3 px-4 text-base bg-gray-50 mb-3 text-gray-800"
                placeholder="Validade (MM/AA)"
                placeholderTextColor="#aaa"
                value={cardExp} 
                onChangeText={(text) => setCardExp(formatCardExp(text))} 
                maxLength={5}
                keyboardType="numeric"
              />
              <TextInput 
                className="flex-1 border border-gray-200 rounded-lg py-3 px-4 text-base bg-gray-50 mb-3 text-gray-800"
                placeholder="CVV"
                placeholderTextColor="#aaa"
                value={cardCvv} 
                onChangeText={setCardCvv} 
                maxLength={4} 
                secureTextEntry 
              />
            </View>
            
            {cardError ? (
              <View className="bg-red-50 border border-red-200 rounded-lg py-2 px-3 mb-3">
                <Text className="text-red-600 text-sm font-medium">{cardError}</Text>
              </View>
            ) : null}
            
            <TouchableOpacity 
              className={`w-full mt-3 py-3 rounded-lg items-center justify-center ${
                savingCard ? 'bg-red-400' : 'bg-red-600'
              }`}
              style={{
                backgroundColor: savingCard ? '#f87171' : '#dc2626',
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 48
              }}
              onPress={async () => {
                if (!cardNumber || !cardName || !cardExp || !cardCvv) {
                  setCardError('Preencha todos os campos');
                  return;
                }

                setCardError('');
                setSavingCard(true);

                try {
                  const user = await getCurrentUser();
                  if (!user?.id) {
                    throw new Error('Usuário não encontrado');
                  }

                  // Gerar token do cartão
                  const token = await generateCardToken({
                    cardNumber,
                    cardExp,
                    cardCvv,
                    cardName
                  });

                  // Salvar cartão no banco
                  const result = await adicionarCartao({
                    usuarioId: user.id,
                    token,
                    cardNumber,
                    cardExp,
                    cardCvv,
                    cardName
                  });

                  // Recarregar lista de cartões
                  await loadCartoesSalvos();

                  // Selecionar o cartão recém-salvo e reutilizar o CVV já digitado
                  const cartaoSalvo = result.cartao;
                  setCartaoSelecionado(cartaoSalvo);
                  setUsarCartaoSalvo(true);
                  setSavedCardCvv(cardCvv); // reutiliza o CVV nesta mesma compra
                  setFormaPagamento('cartao');
                  
                  setShowCardModal(false);
                  setCardNumber('');
                  setCardName('');
                  setCardExp('');
                  setCardCvv('');
                  
                  // Não abrir modal de CVV agora, pois já temos o CVV desta sessão
                } catch (error: any) {
                  console.error('Erro ao salvar cartão:', error);
                  setCardError(error.message || 'Erro ao salvar cartão. Tente novamente.');
                } finally {
                  setSavingCard(false);
                }
              }}
              disabled={savingCard}
            >
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                {savingCard ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text 
                    className="text-white text-base font-bold"
                    style={{ 
                      color: '#ffffff', 
                      fontSize: 16, 
                      fontWeight: 'bold',
                      textAlign: 'center'
                    }}
                  >
                    Confirmar Cartão
                  </Text>
                )}
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="mt-2 self-center"
              onPress={() => {
                setShowCardModal(false);
                setCardError('');
                setCardNumber('');
                setCardName('');
                setCardExp('');
                setCardCvv('');
                setUsarCartaoSalvo(false);
              }}
              activeOpacity={0.8}
            >
              <Text className="text-red-600 font-bold">Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default FormaPagamentoScreen;

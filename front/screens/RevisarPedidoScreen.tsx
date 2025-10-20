import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
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
  
  // Dados vindos das telas anteriores
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
    // Carregar userId e dados do usuário
    getCurrentUser().then(async (user) => {
      setUserId(user?.id ? String(user.id) : null);
      
      // Buscar dados completos do usuário
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
    // Taxa de entrega vem dos parâmetros da tela anterior
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
        return `Cartão ****${cardNumber.slice(-4)}`;
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
      // Obter estabelecimentoId do primeiro item do carrinho
      const estabelecimentoId = cartItems[0].estabelecimentoId;
      
      if (!estabelecimentoId) {
        Alert.alert('Erro', 'Estabelecimento não identificado');
        return;
      }

      // Se for PIX, iniciar pagamento sem criar pedido
      if (formaPagamento === 'pix') {
        const pixResp = await iniciarPagamentoPix({
          amount: calculateTotal(),
          description: `Pedido em ${estabelecimentoId}`,
          payerEmail: userData?.email || 'usuario@exemplo.com',
          payerFirstName: userData?.nome?.split(' ')[0] || 'Usuario',
          payerLastName: userData?.nome?.split(' ').slice(1).join(' ') || 'Teste',
          payerCpf: '19119119100', // CPF válido para testes conforme documentação
          payerAddress: {
            zip_code: '06233200',
            street_name: 'Av. das Nações Unidas',
            street_number: '3003',
            neighborhood: 'Bonfim',
            city: 'Osasco',
            federal_unit: 'SP'
          },
        });
        
        // Navegar para tela de confirmação PIX
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

      // Se for pagamento com cartão, processar pagamento primeiro
      if (formaPagamento === 'cartao') {
        let paymentResult;
        
        try {
          if (usarCartaoSalvo && cartaoSelecionado) {
            // Pagamento com cartão salvo
            console.log('💳 Processando pagamento com cartão salvo...');
            
            if (!savedCardCvv) {
              Alert.alert('Erro', 'CVV do cartão é obrigatório');
              return;
            }

            // Buscar customer ID do usuário
            const user = await getCurrentUser();
            if (!user?.id) {
              throw new Error('Usuário não encontrado');
            }

            // Buscar dados completos do usuário para obter customerId do MercadoPago
            const usuarioCompleto = await getUsuarioById(String(user.id));
            if (!usuarioCompleto.mercadoPagoCustomerId) {
              throw new Error('Usuário não possui customer ID do MercadoPago');
            }

            paymentResult = await createPaymentWithSavedCard({
              amount: calculateTotal(),
              description: `Pedido em ${estabelecimentoId}`,
              payerEmail: userData?.email || '',
              customerId: usuarioCompleto.mercadoPagoCustomerId,
              cardId: cartaoSelecionado.id.toString(), // ID do cartão no banco local (não o mercadoPagoCardId)
              securityCode: savedCardCvv,
              installments: 1,
              paymentMethodId: cartaoSelecionado.paymentMethodId
            });
          } else {
            // Pagamento com cartão novo
            console.log('💳 Processando pagamento com cartão novo...');
            
            if (!cardNumber || !cardName || !cardExp || !cardCvv) {
              Alert.alert('Erro', 'Dados do cartão incompletos');
              return;
            }

            // Gerar token do cartão
            const token = await generateCardToken({
              cardNumber,
              cardExp,
              cardCvv,
              cardName
            });

            // Detectar bandeira
            const paymentMethodId = CardManagementService.detectCardBrand(cardNumber);

            // Processar pagamento
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

          // Verificar se pagamento foi aprovado ou está pendente
          if (paymentResult.status === 'approved' || paymentResult.status === 'pending') {
            console.log('✅ Pagamento processado:', paymentResult.paymentId);
            
            // Criar pedido com paymentId
            const payload = {
              clienteId: Number(userId),
              estabelecimentoId: Number(estabelecimentoId),
              produtos: cartItems.map((item) => ({
                produtoId: Number(item.id),
                quantidade: item.quantidade
              })),
              formaPagamento: 'cartao',
              total: calculateTotal(),
              // Informações de pagamento
              paymentId: paymentResult.paymentId,
              paymentStatus: paymentResult.status,
              paymentMethod: 'credit_card',
              // Endereço de entrega
              enderecoEntrega: endereco?.address || endereco,
            };
            
            console.log('Criando pedido com payload:', payload);
            const response = await createOrder(payload);
            console.log('Pedido criado com sucesso:', response);
            
            // Limpar carrinho
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

      // Para dinheiro ou outros métodos, criar pedido diretamente
      const payload = {
        clienteId: Number(userId),
        estabelecimentoId: Number(estabelecimentoId),
        produtos: cartItems.map((item) => ({
          produtoId: Number(item.id),
          quantidade: item.quantidade
        })),
        formaPagamento: formaPagamento || 'dinheiro',
        total: calculateTotal(),
        // Informações de pagamento na entrega (se aplicável)
        formaPagamentoEntrega: formaPagamentoEntrega,
        precisaTroco: precisaTroco,
        trocoParaQuanto: precisaTroco ? parseFloat(trocoParaQuanto || '0') : undefined,
        // Endereço de entrega
        enderecoEntrega: endereco?.address || endereco,
      };
      
      console.log('Criando pedido com payload:', payload);
      
      // Criar o pedido
      const response = await createOrder(payload);
      console.log('Pedido criado com sucesso:', response);
      
      // Limpar carrinho
      dispatch({ type: 'CLEAR_CART' });
      
      Alert.alert(
        'Pedido Confirmado!', 
        'Seu pedido foi realizado com sucesso e está sendo preparado.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navegar para tela de pedidos
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SACOLA</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Modal de revisão */}
        <View style={styles.reviewModal}>
          <Text style={styles.reviewTitle}>Revise o seu pedido</Text>
          
          {/* Entrega */}
          <View style={styles.reviewItem}>
            <Text style={styles.reviewIcon}>🏍️</Text>
            <View style={styles.reviewContent}>
              <Text style={styles.reviewLabel}>Entrega hoje</Text>
              <Text style={styles.reviewValue}>Hoje, 70 - 80 min</Text>
            </View>
          </View>

          {/* Endereço */}
          <View style={styles.reviewItem}>
            <Text style={styles.reviewIcon}>📍</Text>
            <View style={styles.reviewContent}>
              <Text style={styles.reviewLabel}>{endereco?.address || 'Endereço não selecionado'}</Text>
              <Text style={styles.reviewValue}>{endereco?.label || 'Endereço'}</Text>
            </View>
          </View>

          {/* Cupom */}
          {/* <View style={styles.reviewItem}>
            <Text style={styles.reviewIcon}>🎫</Text>
            <View style={styles.reviewContent}>
              <Text style={styles.reviewLabel}>Cupom</Text>
              <Text style={styles.reviewValue}>1 do Clube para usar nessa loja</Text>
            </View>
          </View> */}

          {/* Pagamento */}
          <View style={styles.reviewItem}>
            <Text style={styles.reviewIcon}>
              {formaPagamento === 'pix' ? '📱' : formaPagamento === 'cartao' ? '💳' : '💵'}
            </Text>
            <View style={styles.reviewContent}>
              <Text style={styles.reviewLabel}>Pagamento pelo app</Text>
              <Text style={styles.reviewValue}>{formatPaymentMethod()}</Text>
            </View>
            <Text style={styles.reviewPrice}>R$ {calculateTotal().toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            loading && { opacity: 0.7 }
          ]}
          onPress={handleConfirmOrder}
          disabled={loading}
        >
          <Text style={styles.confirmButtonText}>
            {loading ? 'Processando...' : 'Fazer pedido'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.changeOrderButton}
          onPress={handleChangeOrder}
        >
          <Text style={styles.changeOrderButtonText}>Alterar pedido</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    fontSize: 24,
    color: '#e5293e',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSpacer: {
    width: 24,
  },
  scrollView: {
    flex: 1,
    paddingBottom: 120,
  },
  reviewModal: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  reviewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  reviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reviewIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  reviewContent: {
    flex: 1,
  },
  reviewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reviewValue: {
    fontSize: 14,
    color: '#666',
  },
  reviewPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingBottom: 34,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  confirmButton: {
    backgroundColor: '#e5293e',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#e5293e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  changeOrderButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  changeOrderButtonText: {
    color: '#e5293e',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RevisarPedidoScreen;

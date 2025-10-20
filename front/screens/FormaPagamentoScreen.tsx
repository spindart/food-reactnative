import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getCurrentUser } from '../services/currentUserService';
import { getCartoes, Cartao } from '../services/cartaoService';
import { useCart } from '../context/CartContext';
import { getEstabelecimentoById } from '../services/estabelecimentoService';

const FormaPagamentoScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { state: cartState } = useCart();
  const [formaPagamento, setFormaPagamento] = useState<'dinheiro' | 'cartao' | 'pix' | null>(null);
  const [taxaEntrega, setTaxaEntrega] = useState(0);
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
  
  // Estados para pagamento na entrega
  const [showDeliveryPaymentModal, setShowDeliveryPaymentModal] = useState(false);
  const [formaPagamentoEntrega, setFormaPagamentoEntrega] = useState<string>('');
  const [precisaTroco, setPrecisaTroco] = useState(false);
  const [trocoParaQuanto, setTrocoParaQuanto] = useState<string>('');

  useEffect(() => {
    loadCartoesSalvos();
    loadTaxaEntrega();
  }, []);

  const loadTaxaEntrega = () => {
    if (cartState.items.length > 0) {
      const estId = cartState.items[0].estabelecimentoId;
      if (estId) {
        getEstabelecimentoById(String(estId)).then((est) => {
          if (est && est.taxaEntrega !== undefined && est.taxaEntrega !== null) {
            setTaxaEntrega(Number(est.taxaEntrega));
          }
        });
      }
    }
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
      if (cartoesSalvos.length > 0) {
        setShowCardSelectionModal(true);
      } else {
        setShowCardModal(true);
      }
    }
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
      Alert.alert('Atenção', 'Digite o CVV do cartão selecionado');
      return;
    }

    // Passar dados para próxima tela
    (navigation as any).navigate('RevisarPedido', {
      ...route.params,
      taxaEntrega: taxaEntrega,
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
        {/* Forma de pagamento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Forma de pagamento</Text>
          
          <View style={styles.paymentOptions}>
            <TouchableOpacity 
              style={[
                styles.paymentOption,
                formaPagamento === 'dinheiro' && styles.paymentOptionSelected
              ]} 
              onPress={() => handlePaymentMethodSelect('dinheiro')}
            >
              <Text style={[
                styles.paymentOptionText,
                formaPagamento === 'dinheiro' && styles.paymentOptionTextSelected
              ]}>
                💵 Pagar na entrega
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.paymentOption,
                formaPagamento === 'cartao' && styles.paymentOptionSelected
              ]} 
              onPress={() => handlePaymentMethodSelect('cartao')}
            >
              <Text style={[
                styles.paymentOptionText,
                formaPagamento === 'cartao' && styles.paymentOptionTextSelected
              ]}>
                💳 Cartão
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.paymentOption,
                formaPagamento === 'pix' && styles.paymentOptionSelected
              ]} 
              onPress={() => handlePaymentMethodSelect('pix')}
            >
              <Text style={[
                styles.paymentOptionText,
                formaPagamento === 'pix' && styles.paymentOptionTextSelected
              ]}>
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo de valores</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>R$ {cartState.items.reduce((total, item) => total + item.preco * item.quantidade, 0).toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Taxa de entrega</Text>
            <Text style={styles.summaryValue}>R$ {taxaEntrega.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRowFinal}>
            <Text style={styles.summaryLabelFinal}>Total</Text>
            <Text style={styles.summaryValueFinal}>R$ {(cartState.items.reduce((total, item) => total + item.preco * item.quantidade, 0) + taxaEntrega).toFixed(2)}</Text>
          </View>
          {/* <View style={styles.discountRow}>
            <Text style={styles.discountText}>Aplique seu cupom e pague</Text>
            <View style={styles.discountValue}>
              <Text style={styles.discountIcon}>💎</Text>
              <Text style={styles.discountAmount}>R$ 23,16</Text>
            </View>
          </View> */}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.reviewButton}
          onPress={handleContinue}
        >
          <Text style={styles.reviewButtonText}>Revisar pedido • R$ {(cartState.items.reduce((total, item) => total + item.preco * item.quantidade, 0) + taxaEntrega).toFixed(2)}</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de Pagamento na Entrega */}
      <Modal visible={showDeliveryPaymentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pagamento na Entrega</Text>
            <Text style={styles.modalSubtitle}>
              Selecione como deseja pagar na entrega:
            </Text>
            
            <View style={styles.deliveryPaymentOptions}>
              <TouchableOpacity 
                style={[styles.deliveryPaymentOption, formaPagamentoEntrega === 'dinheiro' && styles.deliveryPaymentOptionSelected]}
                onPress={() => setFormaPagamentoEntrega('dinheiro')}
              >
                <Text style={[styles.deliveryPaymentText, formaPagamentoEntrega === 'dinheiro' && styles.deliveryPaymentTextSelected]}>
                  💵 Dinheiro
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.deliveryPaymentOption, formaPagamentoEntrega === 'debito' && styles.deliveryPaymentOptionSelected]}
                onPress={() => setFormaPagamentoEntrega('debito')}
              >
                <Text style={[styles.deliveryPaymentText, formaPagamentoEntrega === 'debito' && styles.deliveryPaymentTextSelected]}>
                  💳 Cartão de Débito
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.deliveryPaymentOption, formaPagamentoEntrega === 'credito' && styles.deliveryPaymentOptionSelected]}
                onPress={() => setFormaPagamentoEntrega('credito')}
              >
                <Text style={[styles.deliveryPaymentText, formaPagamentoEntrega === 'credito' && styles.deliveryPaymentTextSelected]}>
                  💳 Cartão de Crédito
                </Text>
              </TouchableOpacity>
            </View>

            {/* Opções de troco para dinheiro */}
            {formaPagamentoEntrega === 'dinheiro' && (
              <View style={styles.trocoSection}>
                <Text style={styles.trocoTitle}>Precisa de troco?</Text>
                
                <TouchableOpacity 
                  style={[styles.trocoOption, precisaTroco && styles.trocoOptionSelected]}
                  onPress={() => setPrecisaTroco(true)}
                >
                  <Text style={[styles.trocoText, precisaTroco && styles.trocoTextSelected]}>Sim</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.trocoOption, !precisaTroco && styles.trocoOptionSelected]}
                  onPress={() => setPrecisaTroco(false)}
                >
                  <Text style={[styles.trocoText, !precisaTroco && styles.trocoTextSelected]}>Não</Text>
                </TouchableOpacity>

                {precisaTroco && (
                  <View style={styles.trocoInputSection}>
                    <Text style={styles.trocoInputLabel}>Troco para quanto?</Text>
                    <TextInput
                      style={styles.trocoInput}
                      placeholder="Ex: 50.00"
                      value={trocoParaQuanto}
                      onChangeText={setTrocoParaQuanto}
                      keyboardType="numeric"
                    />
                    <Text style={styles.trocoTotalText}>
                      Total do pedido: R$ 27,89
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setFormaPagamentoEntrega('');
                  setPrecisaTroco(false);
                  setTrocoParaQuanto('');
                  setShowDeliveryPaymentModal(false);
                }}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.modalButtonPrimary,
                  !formaPagamentoEntrega && { opacity: 0.5 }
                ]}
                onPress={handleConfirmDeliveryPayment}
                disabled={!formaPagamentoEntrega}
              >
                <Text style={[
                  styles.modalButtonTextPrimary,
                  !formaPagamentoEntrega && { color: '#999' }
                ]}>
                  {formaPagamentoEntrega ? 'Confirmar' : 'Selecione uma opção'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Seleção de Cartões Salvos */}
      <Modal visible={showCardSelectionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecionar Cartão</Text>
            
            {cartoesSalvos.length > 0 ? (
              <>
                {cartoesSalvos.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.cartaoOption,
                      cartaoSelecionado?.id === item.id && styles.cartaoOptionSelected
                    ]}
                    onPress={() => setCartaoSelecionado(item)}
                  >
                    <View style={styles.cartaoOptionInfo}>
                      <Text style={styles.cartaoOptionBandeira}>{item.paymentMethodId.toUpperCase()}</Text>
                      <Text style={styles.cartaoOptionNumero}>****{item.lastFourDigits}</Text>
                      <Text style={styles.cartaoOptionValidade}>
                        {item.expirationMonth.toString().padStart(2, '0')}/{item.expirationYear.toString().slice(-2)}
                      </Text>
                    </View>
                    {item.isDefault && (
                      <Text style={styles.cartaoOptionPadrao}>PADRÃO</Text>
                    )}
                  </TouchableOpacity>
                ))}
                
                {/* Campo CVV para cartão salvo */}
                {cartaoSelecionado && (
                  <View style={styles.cvvSection}>
                    <Text style={styles.cvvTitle}>Código de Segurança (CVV)</Text>
                    <TextInput
                      style={styles.cvvInput}
                      placeholder="Digite o CVV"
                      value={savedCardCvv}
                      onChangeText={setSavedCardCvv}
                      keyboardType="numeric"
                      maxLength={4}
                      secureTextEntry
                    />
                    <Text style={styles.cvvDescription}>
                      Por segurança, precisamos do CVV para processar o pagamento
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.noCardsContainer}>
                <Text style={styles.noCardsText}>
                  Nenhum cartão salvo encontrado
                </Text>
                <Text style={styles.noCardsSubtext}>
                  Adicione um cartão para facilitar seus pagamentos futuros
                </Text>
              </View>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setUsarCartaoSalvo(false);
                  setShowCardSelectionModal(false);
                  setShowCardModal(true);
                }}
              >
                <Text style={styles.modalButtonTextSecondary}>Adicionar Novo Cartão</Text>
              </TouchableOpacity>
              
              {cartaoSelecionado && (
                <TouchableOpacity
                  style={[
                    styles.modalButton, 
                    styles.modalButtonPrimary,
                    !savedCardCvv && { opacity: 0.5 }
                  ]}
                  onPress={() => {
                    if (!savedCardCvv) {
                      Alert.alert('Erro', 'Digite o CVV do cartão');
                      return;
                    }
                    setUsarCartaoSalvo(true);
                    setShowCardSelectionModal(false);
                    Alert.alert('Sucesso', 'Cartão selecionado com sucesso!');
                  }}
                  disabled={!savedCardCvv}
                >
                  <Text style={styles.modalButtonTextPrimary}>
                    Usar Cartão Selecionado
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                setShowCardSelectionModal(false);
                if (!savedCardCvv) {
                  setUsarCartaoSalvo(false);
                  setCartaoSelecionado(null);
                }
              }}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Novo Cartão */}
      <Modal visible={showCardModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pagamento com Cartão</Text>
            
            <TextInput 
              style={styles.modalInput} 
              placeholder="Número do cartão" 
              keyboardType="numeric" 
              value={cardNumber} 
              onChangeText={setCardNumber} 
              maxLength={19} 
            />
            <TextInput 
              style={styles.modalInput} 
              placeholder="Nome impresso no cartão" 
              value={cardName} 
              onChangeText={setCardName} 
            />
            <View style={styles.inputRow}>
              <TextInput 
                style={[styles.modalInput, styles.inputHalf]} 
                placeholder="Validade (MM/AA)" 
                value={cardExp} 
                onChangeText={(text) => setCardExp(formatCardExp(text))} 
                maxLength={5}
                keyboardType="numeric"
              />
              <TextInput 
                style={[styles.modalInput, styles.inputHalf]} 
                placeholder="CVV" 
                value={cardCvv} 
                onChangeText={setCardCvv} 
                maxLength={4} 
                secureTextEntry 
              />
            </View>
            
            {cardError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{cardError}</Text>
              </View>
            ) : null}
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalButtonPrimary, { marginTop: 12 }]} 
              onPress={() => {
                if (!cardNumber || !cardName || !cardExp || !cardCvv) {
                  setCardError('Preencha todos os campos');
                  return;
                }
                setUsarCartaoSalvo(false);
                setShowCardModal(false);
                setCardError('');
                Alert.alert('Sucesso', 'Dados do cartão preenchidos!');
              }}
            >
              <Text style={styles.modalButtonTextPrimary}>Confirmar Cartão</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                setShowCardModal(false);
                setCardError('');
                setCardNumber('');
                setCardName('');
                setCardExp('');
                setCardCvv('');
                setUsarCartaoSalvo(false);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentOption: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  paymentOptionSelected: {
    backgroundColor: '#e5293e',
    borderColor: '#e5293e',
  },
  paymentOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  paymentOptionTextSelected: {
    color: '#fff',
  },
  couponSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  couponInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  couponIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  couponDetails: {
    flex: 1,
  },
  couponTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  couponDescription: {
    fontSize: 14,
    color: '#8B5CF6',
  },
  addCouponButton: {
    fontSize: 16,
    color: '#e5293e',
    fontWeight: '600',
  },
  donationSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  donationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  donationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  helpIcon: {
    fontSize: 16,
    color: '#666',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    width: 20,
    height: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  donationDescription: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  summaryLabelFinal: {
    fontSize: 18,
    color: '#333',
    fontWeight: 'bold',
  },
  summaryValueFinal: {
    fontSize: 18,
    color: '#e5293e',
    fontWeight: 'bold',
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
  discountText: {
    fontSize: 14,
    color: '#666',
  },
  discountValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  discountAmount: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: 'bold',
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
  },
  reviewButton: {
    backgroundColor: '#e5293e',
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginVertical: 16,
    alignItems: 'center',
    shadowColor: '#e5293e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 8,
    color: '#e5293e',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    marginBottom: 12,
    color: '#333',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#e5293e',
  },
  modalButtonSecondary: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalButtonTextSecondary: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    marginTop: 8,
    alignSelf: 'center',
  },
  cancelButtonText: {
    color: '#e5293e',
    fontWeight: 'bold',
  },
  // Delivery payment modal styles
  deliveryPaymentOptions: {
    marginBottom: 20,
  },
  deliveryPaymentOption: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  deliveryPaymentOptionSelected: {
    backgroundColor: '#e5293e',
    borderColor: '#e5293e',
  },
  deliveryPaymentText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deliveryPaymentTextSelected: {
    color: '#fff',
  },
  trocoSection: {
    marginBottom: 20,
  },
  trocoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  trocoOption: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  trocoOptionSelected: {
    backgroundColor: '#e5293e',
    borderColor: '#e5293e',
  },
  trocoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  trocoTextSelected: {
    color: '#fff',
  },
  trocoInputSection: {
    marginTop: 12,
  },
  trocoInputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  trocoInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  trocoTotalText: {
    fontSize: 12,
    color: '#666',
  },
  // Card selection modal styles
  cartaoOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
  },
  cartaoOptionSelected: {
    borderColor: '#e5293e',
    backgroundColor: '#fff5f5',
  },
  cartaoOptionInfo: {
    flex: 1,
  },
  cartaoOptionBandeira: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cartaoOptionNumero: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  cartaoOptionValidade: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  cartaoOptionPadrao: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#e5293e',
    backgroundColor: '#fff5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cvvSection: {
    marginTop: 16,
  },
  cvvTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  cvvInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  cvvDescription: {
    fontSize: 12,
    color: '#666',
  },
  noCardsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noCardsText: {
    color: '#666',
    fontSize: 16,
    marginBottom: 16,
  },
  noCardsSubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '500',
  },
});

export default FormaPagamentoScreen;

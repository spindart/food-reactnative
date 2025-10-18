import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, Pressable, Image, ActivityIndicator, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { createOrder } from '../services/orderService';
import { getEstabelecimentoById } from '../services/estabelecimentoService';
import { useCart } from '../context/CartContext';
import { getCurrentUser } from '../services/currentUserService';
import { useRoute, useNavigation } from '@react-navigation/native';
import { iniciarPagamentoPix, consultarStatusPagamento } from '../services/pixService';
import { createCardPayment, getCardPaymentStatus, generateCardToken, generateSavedCardToken, CardPaymentResponse } from '../services/cardPaymentService';
import { getCartoes, getCartaoPadrao, Cartao, adicionarCartao } from '../services/cartaoService';

import * as Clipboard from 'expo-clipboard';
import { Animated } from 'react-native';

const CheckoutScreen: React.FC = () => {
  const { state: cartState, dispatch } = useCart();
  const route = useRoute<any>();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [enderecos, setEnderecos] = useState<any[]>([]);
  const [enderecoId, setEnderecoId] = useState<number | null>(null);
  const [endereco, setEndereco] = useState('');
  useEffect(() => {
    (async () => {
      try {
        const res = await import('../services/enderecoService');
        const lista = await res.getEnderecos();
        setEnderecos(lista);
        // Seleciona endereço padrão se houver
        const padrao = lista.find((e: any) => e.isDefault);
        if (padrao) {
          setEnderecoId(padrao.id);
          setEndereco(padrao.address);
        } else if (lista.length > 0) {
          setEnderecoId(lista[0].id);
          setEndereco(lista[0].address);
        }
      } catch (e) {}
    })();
  }, []);
  const [pagamento, setPagamento] = useState<'dinheiro' | 'cartao' | 'pix'>('dinheiro');
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExp, setCardExp] = useState('');
  
  // Função para formatar data de expiração com validação
  const formatCardExp = (text: string) => {
    // Remove tudo que não é número
    const numbers = text.replace(/\D/g, '');
    
    // Limita a 4 dígitos
    const limited = numbers.substring(0, 4);
    
    // Se tem pelo menos 2 dígitos, adiciona a barra
    if (limited.length >= 2) {
      const month = limited.substring(0, 2);
      const year = limited.substring(2);
      
      // Valida o mês em tempo real
      if (month.length === 2) {
        const monthNum = parseInt(month, 10);
        if (monthNum > 12) {
          // Se o mês for maior que 12, ajusta para 12
          return '12/' + year;
        }
        if (monthNum === 0) {
          // Se o mês for 0, ajusta para 01
          return '01/' + year;
        }
      }
      
      return month + '/' + year;
    }
    return limited;
  };

  // Função para validar mês
  const validateMonth = (month: string) => {
    const monthNum = parseInt(month, 10);
    return monthNum >= 1 && monthNum <= 12;
  };
  const [cardCvv, setCardCvv] = useState('');
  const [cardError, setCardError] = useState('');
  const [paymentResponse, setPaymentResponse] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [pixTimer, setPixTimer] = useState(300); // 5 minutos
  const [copied, setCopied] = useState(false);
  const [pixPaymentId, setPixPaymentId] = useState<string | null>(null);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const [taxaEntrega, setTaxaEntrega] = useState(0);
  // Estado para armazenar o ID do pedido criado
  const [pedidoId, setPedidoId] = useState<number | null>(null);
  
  // Estados para cartões salvos
  const [cartoesSalvos, setCartoesSalvos] = useState<Cartao[]>([]);
  const [cartaoSelecionado, setCartaoSelecionado] = useState<Cartao | null>(null);
  const [usarCartaoSalvo, setUsarCartaoSalvo] = useState(false);
  const [showCardSelectionModal, setShowCardSelectionModal] = useState(false);
  const [savedCardCvv, setSavedCardCvv] = useState('');

  React.useEffect(() => {
    getCurrentUser().then(async (user) => {
      setUserId(user?.id ? String(user.id) : null);
      
      // Carregar cartões salvos
      if (user?.id) {
        try {
          const cartoes = await getCartoes(user.id);
          setCartoesSalvos(cartoes);
          
          // Definir cartão padrão se existir
          if (cartoes.length > 0) {
            const cartaoPadrao = cartoes.find(c => c.isDefault) || cartoes[0];
            setCartaoSelecionado(cartaoPadrao);
            setUsarCartaoSalvo(true);
          }
        } catch (error) {
          console.log('Erro ao carregar cartões salvos:', error);
        }
      }
    });
    
    // Descobrir o estabelecimento do primeiro item do carrinho
    let estId = route.params?.estabelecimentoId;
    if (!estId && cartState.items.length > 0) {
      estId = cartState.items[0].estabelecimentoId;
    }
    if (estId) {
      setEstabelecimentoId(String(estId));
      getEstabelecimentoById(String(estId)).then((est) => {
        if (est && est.taxaEntrega !== undefined && est.taxaEntrega !== null) {
          setTaxaEntrega(Number(est.taxaEntrega));
        }
      });
    }
  }, [route.params, cartState.items]);

  const cartItems = cartState.items;

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + item.preco * item.quantidade, 0);
  };
  const calculateTotal = () => {
    return (calculateSubtotal() + taxaEntrega).toFixed(2);
  };

  // Função para checar status do pagamento
  async function checkPaymentStatus(paymentId: string) {
    setPolling(true);
    try {
      const resp = await consultarStatusPagamento(paymentId);
      setPaymentStatus(resp.status);
      if (resp.status === 'approved') {
        // Finaliza o pedido após pagamento aprovado
        await finalizarPedidoAposPagamento(paymentId);
      }
    } catch (e) {
      setPaymentStatus('rejected');
    } finally {
      setPolling(false);
    }
  }

  // Efeito para polling do status do pagamento PIX
  React.useEffect(() => {
    if (pixPaymentId && paymentStatus === 'pending') {
      const interval = setInterval(() => {
        checkPaymentStatus(pixPaymentId);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [pixPaymentId, paymentStatus]);

  // Efeito para countdown do timer
  React.useEffect(() => {
    if (paymentResponse && paymentResponse.point_of_interaction && paymentResponse.status === 'pending') {
      setPixTimer(300);
      const interval = setInterval(() => {
        setPixTimer((prev) => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [paymentResponse]);

  // Efeito para animação de cópia
  React.useEffect(() => {
    if (copied) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => setCopied(false));
        }, 1200);
      });
    }
  }, [copied]);

  // Função para copiar código PIX
  const handleCopyPixCode = () => {
    if (paymentResponse?.qr_code) {
      Clipboard.setStringAsync(paymentResponse.qr_code);
      setCopied(true);
    }
  };

  // Função para salvar cartão
  const handleSalvarCartao = async () => {
    console.log('🔄 handleSalvarCartao chamado');
    console.log('📝 Dados do cartão:', { cardNumber, cardName, cardExp, cardCvv });
    
    if (!cardNumber || !cardName || !cardExp || !cardCvv) {
      console.log('❌ Campos obrigatórios ausentes');
      setCardError('Preencha todos os campos');
      return;
    }

    // Validação da data de expiração
    const expParts = cardExp.split('/');
    if (expParts.length !== 2 || expParts[0].length !== 2 || expParts[1].length !== 2) {
      setCardError('Data de expiração inválida. Use MM/AA');
      return;
    }
    
    const expMonth = parseInt(expParts[0], 10);
    const expYear = parseInt(expParts[1], 10);
    
    if (expMonth < 1 || expMonth > 12) {
      setCardError('Mês inválido. Use um valor entre 01 e 12');
      return;
    }
    
    const currentYear = new Date().getFullYear() % 100;
    if (expYear < currentYear) {
      setCardError('Cartão expirado. Verifique a data de validade');
      return;
    }

    try {
      console.log('🚀 Iniciando salvamento do cartão');
      setLoading(true);
      setCardError('');

      const user = await getCurrentUser();
      console.log('👤 Usuário obtido:', user);
      if (!user?.id) {
        console.log('❌ Usuário não autenticado');
        setCardError('Usuário não autenticado');
        return;
      }

      // Gerar token do cartão
      console.log('🔑 Gerando token do cartão...');
      const token = await generateCardToken({ cardNumber, cardExp, cardCvv, cardName });
      console.log('✅ Token gerado:', token);

      // Adicionar cartão
      console.log('💳 Chamando adicionarCartao...');
      const response = await adicionarCartao({
        usuarioId: user.id,
        token,
        cardNumber,
        cardExp,
        cardCvv,
        cardName
      });
      console.log('✅ Resposta do adicionarCartao:', response);

      // Recarregar cartões salvos
      const cartoes = await getCartoes(user.id);
      console.log('✅ Cartões recarregados:', cartoes);
      setCartoesSalvos(cartoes);
      
      // Definir o novo cartão como selecionado e padrão
      setCartaoSelecionado(response.cartao);
      setUsarCartaoSalvo(true);
      console.log('✅ Novo cartão definido como padrão:', response.cartao);
      
      // Fechar modal e limpar campos
      setShowCardModal(false);
      setCardNumber('');
      setCardName('');
      setCardExp('');
      setCardCvv('');
      
      setSuccess('Cartão salvo com sucesso!');
      
      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err: any) {
      console.log('❌ ERRO ao salvar cartão:', err);
      console.log('❌ Erro message:', err.message);
      console.log('❌ Erro stack:', err.stack);
      setCardError(err.message || 'Erro ao salvar cartão');
    } finally {
      console.log('🏁 Finalizando salvamento do cartão');
      setLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
  console.log('handleConfirmOrder chamado', { pagamento, cardNumber, cardName, cardExp, cardCvv });
    if (pagamento === 'pix') {
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        if (!userId || !estabelecimentoId) {
          setError('Usuário ou estabelecimento não encontrado.');
          setLoading(false);
          return;
        }
        // Inicia pagamento PIX (sem criar pedido antes)
        const pixResp = await iniciarPagamentoPix({
          amount: calculateSubtotal() + taxaEntrega,
          description: `Pedido em ${estabelecimentoId}`,
          payerEmail: 'teste@teste.com', // Email válido para testes
          // Não enviar pedidoId - será criado após pagamento aprovado
        });
        setPaymentResponse(pixResp);
        setPixPaymentId(pixResp.paymentId);
        setPaymentStatus('pending');
        setSuccess('Pagamento PIX iniciado! Veja o QR Code abaixo.');
      } catch (error) {
        setError('Erro ao iniciar pagamento PIX.');
      } finally {
        setLoading(false);
      }
      return;
    }
    if (pagamento === 'cartao') {
      // Se tem cartões salvos e não está usando cartão salvo, mostrar modal de seleção
      if (cartoesSalvos.length > 0 && !usarCartaoSalvo) {
        setShowCardSelectionModal(true);
        return;
      }
      
      // Se está usando cartão salvo, validar se tem cartão selecionado e CVV
      if (usarCartaoSalvo && !cartaoSelecionado) {
        setError('Selecione um cartão para pagar.');
        return;
      }
      
      if (usarCartaoSalvo && !savedCardCvv) {
        setError('Digite o CVV do cartão selecionado.');
        setShowCardSelectionModal(true);
        return;
      }
      
      // Se não está usando cartão salvo, validar dados do formulário
      if (!usarCartaoSalvo) {
        if (!cardNumber || !cardName || !cardExp || !cardCvv) {
          setCardError('Preencha todos os dados do cartão.');
          setShowCardModal(true);
          return;
        }
      }
      
      // Validação da data de expiração (apenas para cartões novos)
      if (!usarCartaoSalvo) {
        const expParts = cardExp.split('/');
        if (expParts.length !== 2 || expParts[0].length !== 2 || expParts[1].length !== 2) {
          setCardError('Data de expiração inválida. Use MM/AA');
          setShowCardModal(true);
          return;
        }
        
        const expMonth = parseInt(expParts[0], 10);
        const expYear = parseInt(expParts[1], 10);
        
        if (expMonth < 1 || expMonth > 12) {
          setCardError('Mês inválido. Use um valor entre 01 e 12');
          setShowCardModal(true);
          return;
        }
        
        const currentYear = new Date().getFullYear() % 100;
        if (expYear < currentYear) {
          setCardError('Cartão expirado. Verifique a data de validade');
          setShowCardModal(true);
          return;
        }
      }
      
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        if (!userId || !estabelecimentoId) {
          setError('Usuário ou estabelecimento não encontrado.');
          setLoading(false);
          return;
        }

        // Criar pedido após pagamento aprovado (não antes)
        // O pedido será criado no backend após pagamento aprovado

        let token: string;
        let paymentMethodId: string;
        let cleanCardNumber: string;
        
        if (usarCartaoSalvo && cartaoSelecionado) {
          // Usar cartão salvo - CONFORME DOCUMENTAÇÃO OFICIAL
          console.log('💳 Usando cartão salvo:', cartaoSelecionado.lastFourDigits);
          console.log('🔑 Enviando card_id + CVV para backend conforme documentação oficial...');
          
          // Para cartões salvos, não precisamos gerar token no frontend
          // O backend irá gerar o token usando card_id + CVV conforme documentação oficial
          token = cartaoSelecionado.mercadoPagoCardId; // Será usado como cardId no backend
          paymentMethodId = cartaoSelecionado.paymentMethodId;
          cleanCardNumber = cartaoSelecionado.firstSixDigits + '****' + cartaoSelecionado.lastFourDigits;
        } else {
          // Gerar token para cartão novo
          token = await generateCardToken({ cardNumber, cardExp, cardCvv, cardName });
          // Detectar bandeira (visa/master/etc) pelo número
          paymentMethodId = 'visa'; // Default
          cleanCardNumber = cardNumber.replace(/\s/g, '');
          
          console.log('Analisando cartão:', cleanCardNumber.substring(0, 6) + '****');
          console.log('Testando regexes:');
          console.log('  /^4/:', /^4/.test(cleanCardNumber));
          console.log('  /^5[0-5]/:', /^5[0-5]/.test(cleanCardNumber));
          console.log('  /^5067/:', /^5067/.test(cleanCardNumber));
          console.log('  /^3[47]/:', /^3[47]/.test(cleanCardNumber));
          
          // Detecção melhorada de bandeiras com logs detalhados
          if (/^4/.test(cleanCardNumber)) {
            paymentMethodId = 'visa';
            console.log('✅ Detectado: Visa (começa com 4)');
          } else if (/^5[0-5]/.test(cleanCardNumber)) {
            // Verificar se é Elo ou Mastercard
            if (/^5067/.test(cleanCardNumber)) {
              paymentMethodId = 'elo';
              console.log('✅ Detectado: Elo (começa com 5067)');
            } else {
              paymentMethodId = 'master';
              console.log('✅ Detectado: Mastercard (começa com 5[0-5])');
            }
          } else if (/^3[47]/.test(cleanCardNumber)) {
            paymentMethodId = 'amex';
            console.log('✅ Detectado: American Express (começa com 3[47])');
          } else if (/^6/.test(cleanCardNumber)) {
            paymentMethodId = 'hipercard';
            console.log('✅ Detectado: Hipercard (começa com 6)');
          } else if (/^3[0689]/.test(cleanCardNumber)) {
            paymentMethodId = 'diners';
            console.log('✅ Detectado: Diners (começa com 3[0689])');
          } else {
            console.log('⚠️ Bandeira não detectada, usando Visa como padrão');
          }
          
          console.log('🎯 Bandeira final:', paymentMethodId, 'para cartão:', cleanCardNumber.substring(0, 4) + '****');
        }
        // Chamar backend para criar pagamento
        const payload = {
          amount: calculateSubtotal() + taxaEntrega,
          description: `Pedido em ${estabelecimentoId}`,
          payerEmail: 'teste@teste.com', // Email válido para testes
          token,
          installments: 1, // ou permitir escolha
          paymentMethodId,
          issuerId: undefined, // ou detectar
          cardNumber: cleanCardNumber, // Enviar número para detecção no backend
          usarCartaoSalvo: usarCartaoSalvo,
          cartaoId: cartaoSelecionado?.id,
          securityCode: usarCartaoSalvo ? savedCardCvv : cardCvv, // CVV para cartões salvos ou novos
          // pedidoId será criado após pagamento aprovado
        };
        console.log('Chamando createCardPayment', payload);
        let cardResp;
        try {
          cardResp = await createCardPayment(payload);
        } catch (err: any) {
          console.log('Erro na chamada createCardPayment:', err);
          setError('Erro ao chamar backend: ' + (err?.message || err));
          setLoading(false);
          return;
        }
        console.log('Resposta do backend (cartao):', cardResp);
        setPaymentResponse(cardResp);
        setPaymentStatus(cardResp.status);
        let cardPaymentId = cardResp.paymentId;
        setShowCardModal(false);
        if (cardResp.status === 'pending') {
          // Polling até aprovação
          let statusResp: CardPaymentResponse | { status: string; status_detail: string; paymentId?: string } = cardResp;
          let tentativas = 0;
          while (statusResp.status === 'pending' && tentativas < 20) {
            await new Promise((res) => setTimeout(res, 4000));
            const statusData = await getCardPaymentStatus(cardPaymentId);
            statusResp = { ...statusData, paymentId: cardPaymentId };
            console.log('Polling status pagamento:', statusResp);
            setPaymentStatus(statusResp.status);
            if (statusResp.status === 'approved') {
              await finalizarPedidoAposPagamento(cardPaymentId);
              setSuccess('Pagamento aprovado! Pedido confirmado.');
              break;
            }
            tentativas++;
          }
          if (statusResp.status !== 'approved') {
            setError('Pagamento não aprovado. Tente novamente.');
          }
        } else if (cardResp.status === 'approved') {
          await finalizarPedidoAposPagamento(cardPaymentId);
          setSuccess('Pagamento aprovado! Pedido confirmado.');
        } else {
          setError('Pagamento não aprovado.');
        }
      } catch (error) {
        setError('Erro ao processar pagamento com cartão.');
      } finally {
        setLoading(false);
      }
      return;
    }
  };

  // Cria o pedido antes do pagamento
  const criarPedidoAntesPagamento = async () => {
    if (!userId || !estabelecimentoId) return null;
    const payload = {
      clienteId: Number(userId),
      estabelecimentoId: Number(estabelecimentoId),
      produtos: cartItems.map((item) => ({
        produtoId: Number(item.id),
        quantidade: item.quantidade
      })),
      formaPagamento: pagamento,
      total: calculateSubtotal() + taxaEntrega,
    };
    console.log('Criando pedido com payload:', payload);
    try {
      const response = await createOrder(payload);
      console.log('Pedido criado com sucesso:', response);
      return response.orderId; // Retorna o ID do pedido criado
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      setError('Erro ao criar pedido.');
      return null;
    }
  };

  // Finaliza o pedido após pagamento aprovado
  const finalizarPedidoAposPagamento = async (paymentId?: string) => {
    if (!userId || !estabelecimentoId) return;
    
    try {
      // Criar pedido após pagamento aprovado
      const payload = {
        clienteId: Number(userId),
        estabelecimentoId: Number(estabelecimentoId),
        produtos: cartItems.map((item) => ({
          produtoId: Number(item.id),
          quantidade: item.quantidade
        })),
        formaPagamento: pagamento,
        total: calculateSubtotal() + taxaEntrega,
        // Informações de pagamento aprovado
        paymentId: paymentId || paymentResponse?.paymentId,
        paymentStatus: 'approved',
        paymentMethod: pagamento === 'pix' ? 'pix' : 'credit_card',
      };
      
      console.log('Criando pedido após pagamento aprovado:', payload);
      const response = await createOrder(payload);
      console.log('Pedido criado com sucesso após pagamento:', response);
      
      setSuccess('Pedido confirmado!');
      dispatch({ type: 'CLEAR_CART' });
      
      // Navegar para a tela de pedidos após 2 segundos
      setTimeout(() => {
        navigation.navigate('Pedidos' as never);
      }, 2000);
    } catch (error) {
      console.error('Erro ao criar pedido após pagamento:', error);
      setError('Erro ao confirmar pedido. Contate o suporte.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Endereço de entrega</Text>
      {enderecos.length > 0 ? (
        <View>
          <Text style={{ marginBottom: 6 }}>Selecione um endereço salvo:</Text>
          <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 12, backgroundColor: '#fff' }}>
            <Picker
              selectedValue={enderecoId}
              onValueChange={(itemValue, itemIndex) => {
                setEnderecoId(itemValue);
                const e = enderecos.find((x) => x.id === itemValue);
                setEndereco(e ? e.address : '');
              }}
              style={{ height: 48 }}
            >
              {enderecos.map((e: any) => (
                <Picker.Item key={e.id} label={`${e.label}${e.isDefault ? ' (Padrão)' : ''} - ${e.address}`} value={e.id} />
              ))}
            </Picker>
          </View>
        </View>
      ) : (
        <TextInput
          style={styles.input}
          value={endereco}
          onChangeText={setEndereco}
          placeholder="Digite o endereço"
        />
      )}
      <Text style={styles.sectionTitle}>Forma de pagamento</Text>
      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        <TouchableOpacity style={[styles.payButton, pagamento === 'dinheiro' && styles.payButtonSelected]} onPress={() => setPagamento('dinheiro')}>
          <Text style={[styles.payButtonText, pagamento === 'dinheiro' && styles.payButtonTextSelected]}>Pagar na entrega</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.payButton, pagamento === 'cartao' && styles.payButtonSelected]} onPress={() => { 
          setPagamento('cartao'); 
          if (cartoesSalvos.length > 0) {
            setShowCardSelectionModal(true);
          } else {
            setShowCardModal(true);
          }
        }}>
          <Text style={[styles.payButtonText, pagamento === 'cartao' && styles.payButtonTextSelected]}>Cartão</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.payButton, pagamento === 'pix' && styles.payButtonSelected]} onPress={() => setPagamento('pix')}>
          <Text style={[styles.payButtonText, pagamento === 'pix' && styles.payButtonTextSelected]}>PIX</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.sectionTitle}>Resumo do pedido</Text>
      <FlatList
        data={cartItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.name}>{item.nome}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => dispatch({ type: 'ADD_ITEM', payload: { ...item, quantidade: -1 } })} style={{ marginHorizontal: 4 }}>
                <Text style={{ fontSize: 18, color: '#e5293e', fontWeight: 'bold' }}>-</Text>
              </TouchableOpacity>
              <Text style={styles.details}>Qtd: {item.quantidade}</Text>
              <TouchableOpacity onPress={() => dispatch({ type: 'ADD_ITEM', payload: { ...item, quantidade: 1 } })} style={{ marginHorizontal: 4 }}>
                <Text style={{ fontSize: 18, color: '#e5293e', fontWeight: 'bold' }}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.details}>R$ {(item.preco * item.quantidade).toFixed(2)}</Text>
            <TouchableOpacity onPress={() => dispatch({ type: 'REMOVE_ITEM', payload: item.id })} style={{ marginLeft: 12 }}>
              <Text style={{ color: '#e5293e', fontWeight: 'bold' }}>Remover</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.list}
      />
      <View style={styles.resumoRow}>
        <Text style={styles.resumoLabel}>Subtotal</Text>
        <Text style={styles.resumoValue}>R$ {calculateSubtotal().toFixed(2)}</Text>
      </View>
      <View style={styles.resumoRow}>
        <Text style={styles.resumoLabel}>Taxa de entrega</Text>
        <Text style={styles.resumoValue}>R$ {taxaEntrega.toFixed(2)}</Text>
      </View>
      <View style={styles.resumoRow}>
        <Text style={styles.resumoLabelTotal}>Total</Text>
        <Text style={styles.resumoValueTotal}>R$ {calculateTotal()}</Text>
      </View>
      {error && <Text style={{ color: 'red', textAlign: 'center' }}>{error}</Text>}
      {success && <Text style={{ color: 'green', textAlign: 'center' }}>{success}</Text>}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: cartItems.length === 0 ? '#ccc' : '#e5293e' }]}
        onPress={handleConfirmOrder}
        disabled={loading || cartItems.length === 0}
      >
        <Text style={styles.buttonText}>{loading ? 'Enviando...' : 'Confirmar Pedido'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#888', marginTop: 8 }]}
        onPress={() => dispatch({ type: 'CLEAR_CART' })}
        disabled={cartItems.length === 0}
      >
        <Text style={styles.buttonText}>Limpar Carrinho</Text>
      </TouchableOpacity>
      {cartItems.length === 0 && (
        <Text style={{ color: '#e5293e', textAlign: 'center', marginTop: 12, fontWeight: 'bold' }}>Seu carrinho está vazio.</Text>
      )}
      {paymentResponse && paymentResponse.qr_code_base64 && (
        <View style={{ alignItems: 'center', marginVertical: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}>
          <Text style={{ fontWeight: 'bold', color: '#e5293e', marginBottom: 8, fontSize: 16 }}>Escaneie o QR Code PIX para pagar</Text>
          <Image
            source={{ uri: `data:image/png;base64,${paymentResponse.qr_code_base64}` }}
            style={{ width: 200, height: 200, borderRadius: 12, borderWidth: 2, borderColor: '#e5293e', marginBottom: 12 }}
            resizeMode="contain"
          />
          <TouchableOpacity onPress={handleCopyPixCode} style={{ backgroundColor: '#e5293e', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 18, marginTop: 8, flexDirection: 'row', alignItems: 'center', shadowColor: '#e5293e', shadowOpacity: 0.15, shadowRadius: 8, elevation: 2 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>Copiar código PIX</Text>
          </TouchableOpacity>
          <Animated.View style={{ opacity: fadeAnim, marginTop: 6 }}>
            {copied && <Text style={{ color: 'green', fontWeight: 'bold' }}>Código copiado!</Text>}
          </Animated.View>
          <Text style={{ color: '#e5293e', marginTop: 10, fontWeight: 'bold', fontSize: 15 }}>
            {pixTimer > 0 ? `Expira em ${Math.floor(pixTimer/60)}:${(pixTimer%60).toString().padStart(2,'0')}` : 'QR Code expirado'}
          </Text>
          {polling && paymentStatus === 'pending' && (
            <View style={{ alignItems: 'center', marginTop: 8 }}>
              <ActivityIndicator size="small" color="#e5293e" />
              <Text style={{ color: '#e5293e', marginTop: 4 }}>Aguardando pagamento...</Text>
            </View>
          )}
          {paymentStatus === 'approved' && (
            <Animated.View style={{ opacity: fadeAnim }}>
              <Text style={{ color: 'green', fontWeight: 'bold', marginTop: 8, fontSize: 16 }}>Pagamento aprovado! Seu pedido está sendo processado.</Text>
            </Animated.View>
          )}
          {paymentStatus === 'rejected' && (
            <Animated.View style={{ opacity: fadeAnim }}>
              <Text style={{ color: 'red', fontWeight: 'bold', marginTop: 8, fontSize: 16 }}>Pagamento rejeitado ou expirado.</Text>
            </Animated.View>
          )}
        </View>
      )}
      <Modal visible={showCardModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 24, width: 320 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8, color: '#e5293e' }}>Pagamento com Cartão</Text>
            <TextInput style={styles.input} placeholder="Número do cartão" keyboardType="numeric" value={cardNumber} onChangeText={setCardNumber} maxLength={19} />
            <TextInput style={styles.input} placeholder="Nome impresso no cartão" value={cardName} onChangeText={setCardName} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput 
                style={[styles.input, { flex: 1 }]} 
                placeholder="Validade (MM/AA)" 
                value={cardExp} 
                onChangeText={(text) => setCardExp(formatCardExp(text))} 
                maxLength={5}
                keyboardType="numeric"
              />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="CVV" value={cardCvv} onChangeText={setCardCvv} maxLength={4} secureTextEntry />
            </View>
            {cardError ? <Text style={{ color: 'red', marginTop: 4 }}>{cardError}</Text> : null}
            <TouchableOpacity 
              style={[styles.button, { marginTop: 12 }]} 
              onPress={handleSalvarCartao}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Salvando...' : 'Salvar cartão'}
              </Text>
            </TouchableOpacity>
            <Pressable style={{ marginTop: 8, alignSelf: 'center' }} onPress={() => {
              setShowCardModal(false);
              setCardError('');
              setCardNumber('');
              setCardName('');
              setCardExp('');
              setCardCvv('');
            }}>
              <Text style={{ color: '#e5293e', fontWeight: 'bold' }}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal de seleção de cartões salvos */}
      <Modal visible={showCardSelectionModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 24, width: '90%', maxHeight: '80%' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 16, color: '#e5293e' }}>Selecionar Cartão</Text>
            
            {cartoesSalvos.length > 0 ? (
              <FlatList
                data={cartoesSalvos}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
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
                )}
                style={{ maxHeight: 300 }}
              />
            ) : (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#666', fontSize: 16, marginBottom: 16 }}>
                  Nenhum cartão salvo encontrado
                </Text>
                <Text style={{ color: '#999', fontSize: 14, textAlign: 'center' }}>
                  Adicione um cartão para facilitar seus pagamentos futuros
                </Text>
              </View>
            )}
            
            {/* Campo CVV para cartão salvo */}
            {cartaoSelecionado && (
              <View style={{ marginTop: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#333' }}>
                  Código de Segurança (CVV)
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#ddd',
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                    backgroundColor: '#fff'
                  }}
                  placeholder="Digite o CVV"
                  value={savedCardCvv}
                  onChangeText={setSavedCardCvv}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
                <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  Por segurança, precisamos do CVV para processar o pagamento
                </Text>
              </View>
            )}
            
            <View style={styles.modalActions}>
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
                  }}
                  disabled={!savedCardCvv}
                >
                  <Text style={styles.modalButtonTextPrimary}>
                    Usar Cartão Selecionado
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            <Pressable style={{ marginTop: 8, alignSelf: 'center' }} onPress={() => setShowCardSelectionModal(false)}>
              <Text style={{ color: '#e5293e', fontWeight: 'bold' }}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  list: {
    marginBottom: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f1f1',
  },
  name: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#222',
    flex: 1,
  },
  details: {
    fontSize: 15,
    color: '#666',
    marginLeft: 8,
  },
  total: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 18,
    color: '#e5293e',
  },
  button: {
    backgroundColor: '#e5293e',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#e5293e',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
    color: '#e5293e',
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#f6f6f6',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#eee',
    color: '#222',
  },
  payButton: {
    backgroundColor: '#f6f6f6',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  payButtonSelected: {
    backgroundColor: '#e5293e',
    borderColor: '#e5293e',
  },
  payButtonText: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 15,
  },
  payButtonTextSelected: {
    color: '#fff',
  },
  resumoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
    marginTop: 2,
    marginHorizontal: 4,
  },
  resumoLabel: {
    color: '#666',
    fontSize: 15,
  },
  resumoValue: {
    color: '#666',
    fontSize: 15,
    fontWeight: 'bold',
  },
  resumoLabelTotal: {
    color: '#e5293e',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resumoValueTotal: {
    color: '#e5293e',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Estilos para modal de seleção de cartões
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
  modalActions: {
    marginTop: 16,
    gap: 8,
  },
  modalButton: {
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
});

export default CheckoutScreen;

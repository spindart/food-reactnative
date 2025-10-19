import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, Pressable, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { createOrder } from '../services/orderService';
import { getEstabelecimentoById } from '../services/estabelecimentoService';
import { useCart } from '../context/CartContext';
import { getCurrentUser } from '../services/currentUserService';
import { useRoute, useNavigation } from '@react-navigation/native';
import { iniciarPagamentoPix, consultarStatusPagamento } from '../services/pixService';
import { createCardPayment, getCardPaymentStatus, generateCardToken, generateSavedCardToken, CardPaymentResponse } from '../services/cardPaymentService';
import { getCartoes, getCartaoPadrao, Cartao, adicionarCartao } from '../services/cartaoService';
import { getEnderecos, addEndereco } from '../services/enderecoService';

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
  const [pagamento, setPagamento] = useState<'dinheiro' | 'cartao' | 'pix' | null>(null);
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
  const [pixTimerActive, setPixTimerActive] = useState<boolean>(false);
  const [pixTimerInterval, setPixTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [copied, setCopied] = useState(false);
  const [pixPaymentId, setPixPaymentId] = useState<string | null>(null);
  
  // Estados para controlar fluxo de pagamento
  const [paymentMethodSelected, setPaymentMethodSelected] = useState<boolean>(false);
  const [orderConfirmed, setOrderConfirmed] = useState<boolean>(false);
  const [paymentProcessing, setPaymentProcessing] = useState<boolean>(false);
  
  // Estados para pagamento na entrega
  const [showDeliveryPaymentModal, setShowDeliveryPaymentModal] = useState<boolean>(false);
  const [formaPagamentoEntrega, setFormaPagamentoEntrega] = useState<string>('');
  const [precisaTroco, setPrecisaTroco] = useState<boolean>(false);
  const [trocoParaQuanto, setTrocoParaQuanto] = useState<string>('');
  
  // Estados para modal de endereço
  const [showAddressModal, setShowAddressModal] = useState<boolean>(false);
  const [newAddressLabel, setNewAddressLabel] = useState<string>('');
  const [newAddressStreet, setNewAddressStreet] = useState<string>('');
  const [newAddressNumber, setNewAddressNumber] = useState<string>('');
  const [newAddressComplement, setNewAddressComplement] = useState<string>('');
  const [newAddressNeighborhood, setNewAddressNeighborhood] = useState<string>('');
  const [newAddressCity, setNewAddressCity] = useState<string>('');
  const [newAddressState, setNewAddressState] = useState<string>('');
  const [newAddressZipCode, setNewAddressZipCode] = useState<string>('');
  const [addressModalError, setAddressModalError] = useState<string | null>(null);
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
          // Só define taxa de entrega se houver itens no carrinho
          if (cartState.items.length > 0) {
            setTaxaEntrega(Number(est.taxaEntrega));
          } else {
            setTaxaEntrega(0);
          }
        }
      });
    }
    
    // Zerar taxa de entrega se carrinho estiver vazio
    if (cartState.items.length === 0) {
      setTaxaEntrega(0);
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
        // Parar timer PIX quando pagamento for aprovado
        stopPixTimer();
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

  // Cleanup do timer PIX quando componente for desmontado
  React.useEffect(() => {
    return () => {
      if (pixTimerInterval) {
        clearInterval(pixTimerInterval);
      }
    };
  }, [pixTimerInterval]);

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

  // Funções para controlar timer PIX
  const startPixTimer = () => {
    setPixTimer(300); // 5 minutos = 300 segundos
    setPixTimerActive(true);
    
    const interval = setInterval(() => {
      setPixTimer((prev) => {
        if (prev <= 1) {
          // Timer expirado
          setPixTimerActive(false);
          clearInterval(interval);
          setPixTimerInterval(null);
          setError('Tempo para pagamento PIX expirado. Inicie um novo pagamento.');
          setPaymentResponse(null);
          setPixPaymentId(null);
          setPaymentStatus(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setPixTimerInterval(interval);
  };

  const stopPixTimer = () => {
    if (pixTimerInterval) {
      clearInterval(pixTimerInterval);
      setPixTimerInterval(null);
    }
    setPixTimerActive(false);
    setPixTimer(300);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
      setPaymentMethodSelected(true);
      console.log('✅ Novo cartão definido como padrão:', response.cartao);
      console.log('✅ paymentMethodSelected definido como true');
      
      // Fechar modal e limpar campos
      setShowCardModal(false);
      setCardNumber('');
      setCardName('');
      setCardExp('');
      setCardCvv('');
      
      setSuccess('Cartão salvo e selecionado com sucesso!');
      
      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err: any) {
      console.log('❌ ERRO ao salvar cartão:', err);
      console.log('❌ Erro message:', err.message);
      console.log('❌ Erro stack:', err.stack);
      setCardError(err.message || 'Erro ao salvar cartão');
      // Limpar erro principal para não impedir confirmação do pedido
      setError(null);
    } finally {
      console.log('🏁 Finalizando salvamento do cartão');
      setLoading(false);
    }
  };

  // Função para limpar todos os estados de erro
  const limparEstadosDeErro = () => {
    setError(null);
    setCardError('');
    setSuccess(null);
    setPaymentProcessing(false);
    setOrderConfirmed(false);
    // NÃO limpar paymentMethodSelected aqui para não interferir no fluxo
  };

  // Função para selecionar método de pagamento
  const handlePaymentMethodSelect = (method: 'dinheiro' | 'cartao' | 'pix') => {
    if (orderConfirmed || paymentProcessing) return; // Não permite trocar após confirmar
    
    // Limpar todos os estados de erro ao mudar forma de pagamento
    limparEstadosDeErro();
    
    setPagamento(method);
    setPaymentMethodSelected(false); // Resetar seleção anterior
    
    // Se for dinheiro, mostrar modal de pagamento na entrega
    if (method === 'dinheiro') {
      setShowDeliveryPaymentModal(true);
    }
    // Se for cartão, mostrar modal de seleção
    else if (method === 'cartao') {
      if (cartoesSalvos.length > 0) {
        setShowCardSelectionModal(true);
      } else {
        setShowCardModal(true);
      }
    }
    // Se for PIX, marcar como selecionado
    else if (method === 'pix') {
      setPaymentMethodSelected(true);
    }
  };

  // Função para confirmar pagamento na entrega
  const handleConfirmDeliveryPayment = () => {
    if (!formaPagamentoEntrega) {
      setError('Selecione uma forma de pagamento');
      return;
    }

    // Validação do troco se for dinheiro
    if (formaPagamentoEntrega === 'dinheiro' && precisaTroco) {
      const trocoValue = parseFloat(trocoParaQuanto);
      const totalPedido = calculateSubtotal() + taxaEntrega;
      
      if (isNaN(trocoValue) || trocoValue <= 0) {
        setError('Digite um valor válido para o troco');
        return;
      }
      
      if (trocoValue < totalPedido) {
        setError(`O valor do troco deve ser maior ou igual ao total do pedido (R$ ${totalPedido.toFixed(2)})`);
        return;
      }
    }

    // Marcar como selecionado e fechar modal
    setPaymentMethodSelected(true);
    setShowDeliveryPaymentModal(false);
    setSuccess(`Pagamento na entrega: ${formaPagamentoEntrega === 'dinheiro' ? 'Dinheiro' : formaPagamentoEntrega === 'debito' ? 'Cartão de Débito' : 'Cartão de Crédito'}${precisaTroco ? ` (Troco para R$ ${trocoParaQuanto})` : ''}`);
  };

  // Função para cancelar seleção de pagamento na entrega
  const handleCancelDeliveryPayment = () => {
    setPagamento(null); // Volta para nenhum método selecionado
    setFormaPagamentoEntrega('');
    setPrecisaTroco(false);
    setTrocoParaQuanto('');
    setShowDeliveryPaymentModal(false);
    setPaymentMethodSelected(false);
  };

  // Função para adicionar endereço
  const handleAddAddress = async () => {
    setAddressModalError(null);
    
    if (!newAddressLabel.trim() || !newAddressStreet.trim() || !newAddressNumber.trim() || !newAddressNeighborhood.trim() || !newAddressCity.trim() || !newAddressState.trim() || !newAddressZipCode.trim()) {
      setAddressModalError('Preencha todos os campos obrigatórios!');
      return;
    }

    try {
      setLoading(true);
      
      // Construir endereço completo
      const enderecoCompleto = `${newAddressStreet}, ${newAddressNumber}${newAddressComplement ? ', ' + newAddressComplement : ''}, ${newAddressNeighborhood}, ${newAddressCity} - ${newAddressState}, ${newAddressZipCode}`;
      
      const novoEndereco = await addEndereco({
        label: newAddressLabel,
        address: enderecoCompleto,
        latitude: 0, // Placeholder - pode ser integrado com geocoding
        longitude: 0, // Placeholder
      });

      // Recarregar endereços
      const lista = await getEnderecos();
      setEnderecos(lista);
      
      // Selecionar o novo endereço
      setEnderecoId(novoEndereco.id);
      setEndereco(novoEndereco.address);
      
      // Fechar modal e limpar campos
      setShowAddressModal(false);
      setNewAddressLabel('');
      setNewAddressStreet('');
      setNewAddressNumber('');
      setNewAddressComplement('');
      setNewAddressNeighborhood('');
      setNewAddressCity('');
      setNewAddressState('');
      setNewAddressZipCode('');
      
      setSuccess('Endereço salvo e selecionado com sucesso!');
      
    } catch (e: any) {
      console.log('Erro ao adicionar endereço:', e);
      setAddressModalError(`Erro ao salvar endereço: ${e.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
    console.log('handleConfirmOrder chamado', { pagamento, cardNumber, cardName, cardExp, cardCvv });
    
    // Validações antes de confirmar
    if (!pagamento) {
      setError('Selecione uma forma de pagamento');
      return;
    }
    
    if (!paymentMethodSelected) {
      if (pagamento === 'dinheiro') {
        setError('Configure o pagamento na entrega antes de confirmar');
      } else {
        setError('Confirme a forma de pagamento');
      }
      return;
    }
    
    if (cartItems.length === 0) {
      setError('Adicione itens ao carrinho');
      return;
    }
    
    if (!endereco.trim()) {
      setError('Digite o endereço de entrega');
      return;
    }
    
    // Marcar como confirmado e processando
    setOrderConfirmed(true);
    setPaymentProcessing(true);
    
    // Se for pagamento na entrega (dinheiro), criar pedido diretamente
    if (pagamento === 'dinheiro') {
      try {
        setLoading(true);
        setError(null);
        setSuccess(null);
        
        const payload = {
          clienteId: Number(userId),
          estabelecimentoId: Number(estabelecimentoId),
          produtos: cartItems.map((item) => ({
            produtoId: Number(item.id),
            quantidade: item.quantidade
          })),
          formaPagamento: 'dinheiro',
          total: calculateSubtotal() + taxaEntrega,
          // Informações de pagamento na entrega
          formaPagamentoEntrega: formaPagamentoEntrega,
          precisaTroco: precisaTroco,
          trocoParaQuanto: precisaTroco ? parseFloat(trocoParaQuanto) : undefined,
          // Endereço de entrega
          enderecoEntrega: endereco,
        };
        
        console.log('🔍 DEBUG - Frontend enviando dados:');
        console.log('  formaPagamentoEntrega:', formaPagamentoEntrega);
        console.log('  precisaTroco:', precisaTroco);
        console.log('  trocoParaQuanto:', trocoParaQuanto);
        console.log('  payload completo:', payload);
        
        console.log('Criando pedido com pagamento na entrega:', payload);
        const response = await createOrder(payload);
        console.log('Pedido criado com sucesso:', response);
        
        setSuccess('Pedido confirmado! Você pagará na entrega.');
        setPaymentProcessing(false);
        
        // Limpar carrinho automaticamente
        dispatch({ type: 'CLEAR_CART' });
        
        // Navegar para a tela de pedidos após 2 segundos
        setTimeout(() => {
          navigation.navigate('Pedidos' as never);
        }, 2000);
        
      } catch (error) {
        console.error('Erro ao criar pedido:', error);
        setError('Erro ao confirmar pedido. Contate o suporte.');
        setPaymentProcessing(false);
      } finally {
        setLoading(false);
      }
      return;
    }
    
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
          payerFirstName: 'Teste',
          payerLastName: 'Usuario',
          payerCpf: '19119119100', // CPF válido para testes conforme documentação
          payerAddress: {
            zip_code: '06233200',
            street_name: 'Av. das Nações Unidas',
            street_number: '3003',
            neighborhood: 'Bonfim',
            city: 'Osasco',
            federal_unit: 'SP'
          },
          // Não enviar pedidoId - será criado após pagamento aprovado
        });
        setPaymentResponse(pixResp);
        setPixPaymentId(pixResp.paymentId);
        setPaymentStatus('pending');
        setSuccess('Pagamento PIX iniciado! Veja o QR Code abaixo.');
        
        // Iniciar timer de 5 minutos para pagamento PIX
        startPixTimer();
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
          setPaymentProcessing(false);
          setOrderConfirmed(false);
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
      formaPagamento: pagamento || 'pix', // Fallback para 'pix' se for null
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
        formaPagamento: pagamento || 'pix', // Fallback para 'pix' se for null
        total: calculateSubtotal() + taxaEntrega,
        // Informações de pagamento aprovado
        paymentId: paymentId || paymentResponse?.paymentId,
        paymentStatus: 'approved',
        paymentMethod: pagamento === 'pix' ? 'pix' : 'credit_card',
        // Informações de pagamento na entrega (se aplicável)
        formaPagamentoEntrega: pagamento === 'dinheiro' ? formaPagamentoEntrega : undefined,
        precisaTroco: pagamento === 'dinheiro' ? precisaTroco : undefined,
        trocoParaQuanto: pagamento === 'dinheiro' && precisaTroco ? parseFloat(trocoParaQuanto) : undefined,
        // Endereço de entrega (sempre enviado)
        enderecoEntrega: endereco,
      };
      
      console.log('🔍 DEBUG - Criando pedido após pagamento aprovado:');
      console.log('  enderecoEntrega:', endereco);
      console.log('  payload completo:', payload);
      const response = await createOrder(payload);
      console.log('Pedido criado com sucesso após pagamento:', response);
      
      setSuccess('Pedido confirmado com sucesso!');
      setPaymentProcessing(false);
      
      // Zerar taxa de entrega após pagamento confirmado
      setTaxaEntrega(0);
      
      // Limpar carrinho automaticamente após pagamento aprovado
      dispatch({ type: 'CLEAR_CART' });
      
      // Navegar para a tela de pedidos após 2 segundos
      setTimeout(() => {
        navigation.navigate('Pedidos' as never);
      }, 2000);
      
    } catch (error) {
      console.error('Erro ao criar pedido após pagamento:', error);
      setError('Erro ao confirmar pedido. Contate o suporte.');
      setPaymentProcessing(false);
    }
  };


  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Endereço de entrega</Text>
        {enderecos.length > 0 ? (
          <View>
            <Text style={{ marginBottom: 6, fontSize: 14, color: '#666' }}>Selecione um endereço salvo:</Text>
            <View style={{ borderWidth: 1, borderColor: '#e9ecef', borderRadius: 12, marginBottom: 12, backgroundColor: '#fff' }}>
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
            <TouchableOpacity 
              style={styles.manageAddressButton}
              onPress={() => navigation.navigate('Enderecos' as never)}
            >
              <Text style={styles.manageAddressButtonText}>Gerenciar Endereços</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noAddressCard}>
            <Text style={styles.noAddressIcon}>📍</Text>
            <Text style={styles.noAddressTitle}>Nenhum endereço salvo</Text>
            <Text style={styles.noAddressSubtext}>Adicione um endereço para facilitar seus pedidos</Text>
            <TouchableOpacity 
              style={styles.addAddressButton}
              onPress={() => setShowAddressModal(true)}
            >
              <Text style={styles.addAddressButtonText}>Adicionar Endereço</Text>
            </TouchableOpacity>
          </View>
        )}
      <Text style={styles.sectionTitle}>Forma de pagamento</Text>
      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        <TouchableOpacity 
          style={[
            styles.payButton, 
            pagamento === 'dinheiro' && pagamento !== null && styles.payButtonSelected,
            (orderConfirmed || paymentProcessing) && styles.payButtonDisabled,
            pagamento === 'dinheiro' && !paymentMethodSelected && styles.payButtonWarning
          ]} 
          onPress={() => handlePaymentMethodSelect('dinheiro')}
          disabled={orderConfirmed || paymentProcessing}
        >
          <Text style={[
            styles.payButtonText, 
            pagamento === 'dinheiro' && pagamento !== null && styles.payButtonTextSelected,
            (orderConfirmed || paymentProcessing) && styles.payButtonTextDisabled,
            pagamento === 'dinheiro' && !paymentMethodSelected && styles.payButtonTextWarning
          ]}>
            Pagar na entrega
            {pagamento === 'dinheiro' && !paymentMethodSelected && ' ⚠️'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.payButton, 
            pagamento === 'cartao' && pagamento !== null && styles.payButtonSelected,
            (orderConfirmed || paymentProcessing) && styles.payButtonDisabled
          ]} 
          onPress={() => handlePaymentMethodSelect('cartao')}
          disabled={orderConfirmed || paymentProcessing}
        >
          <Text style={[
            styles.payButtonText, 
            pagamento === 'cartao' && pagamento !== null && styles.payButtonTextSelected,
            (orderConfirmed || paymentProcessing) && styles.payButtonTextDisabled
          ]}>Cartão</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.payButton, 
            pagamento === 'pix' && pagamento !== null && styles.payButtonSelected,
            (orderConfirmed || paymentProcessing) && styles.payButtonDisabled
          ]} 
          onPress={() => handlePaymentMethodSelect('pix')}
          disabled={orderConfirmed || paymentProcessing}
        >
          <Text style={[
            styles.payButtonText, 
            pagamento === 'pix' && pagamento !== null && styles.payButtonTextSelected,
            (orderConfirmed || paymentProcessing) && styles.payButtonTextDisabled
          ]}>PIX</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.sectionTitle}>Resumo do pedido</Text>
      {cartItems.length > 0 ? (
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
      ) : (
        <View style={styles.emptyOrderSummary}>
          <Text style={styles.emptyOrderIcon}>📋</Text>
          <Text style={styles.emptyOrderText}>Nenhum item no pedido</Text>
        </View>
      )}
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
      {/* Feedback Messages */}
      {error && (
        <View style={styles.feedbackContainer}>
          <View style={styles.feedbackError}>
            <Text style={styles.feedbackIcon}>⚠️</Text>
            <Text style={styles.feedbackErrorText}>{error}</Text>
          </View>
        </View>
      )}
      {success && (
        <View style={styles.feedbackContainer}>
          <View style={styles.feedbackSuccess}>
            <Text style={styles.feedbackIcon}>✅</Text>
            <Text style={styles.feedbackSuccessText}>{success}</Text>
          </View>
        </View>
      )}
      <TouchableOpacity
        style={[
          styles.button, 
          { 
            backgroundColor: cartItems.length === 0 || !pagamento || !paymentMethodSelected ? '#ccc' : '#e5293e',
            opacity: (orderConfirmed || paymentProcessing) ? 0.7 : 1
          }
        ]}
        onPress={() => {
          console.log('🔄 Botão Confirmar Pedido pressionado');
          console.log('🔄 Estados:', { 
            loading, 
            cartItemsLength: cartItems.length, 
            pagamento, 
            paymentMethodSelected, 
            orderConfirmed, 
            paymentProcessing 
          });
          handleConfirmOrder();
        }}
        disabled={loading || cartItems.length === 0 || !pagamento || !paymentMethodSelected || orderConfirmed || paymentProcessing}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Processando...' : 
           orderConfirmed ? 'Pedido Confirmado' : 
           paymentProcessing ? 'Processando Pagamento...' : 
           cartItems.length === 0 ? 'Adicione itens ao carrinho' :
           !pagamento ? 'Selecione uma forma de pagamento' :
           !paymentMethodSelected ? 'Configure o pagamento' :
           'Confirmar Pedido'}
        </Text>
      </TouchableOpacity>
      {/* Botão Limpar Carrinho - só aparece antes de confirmar */}
      {!orderConfirmed && !paymentProcessing && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#888', marginTop: 8 }]}
          onPress={() => dispatch({ type: 'CLEAR_CART' })}
          disabled={cartItems.length === 0}
        >
          <Text style={styles.buttonText}>Limpar Carrinho</Text>
        </TouchableOpacity>
      )}
      
      {cartItems.length === 0 && (
        <View style={styles.emptyCartContainer}>
          <View style={styles.emptyCartCard}>
            <Text style={styles.emptyCartIcon}>🛒</Text>
            <Text style={styles.emptyCartTitle}>Carrinho Vazio</Text>
            <Text style={styles.emptyCartSubtext}>
              Adicione produtos ao seu carrinho para continuar com o pedido
            </Text>
            <TouchableOpacity 
              style={styles.emptyCartButton}
              onPress={() => navigation.navigate('Home' as never)}
            >
              <Text style={styles.emptyCartButtonText}>Ver Produtos</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {paymentResponse && paymentResponse.qr_code_base64 && (
        <View style={styles.pixPaymentContainer}>
          {/* Header com título e timer */}
          <View style={styles.pixHeader}>
            <Text style={styles.pixTitle}>Pagamento via PIX</Text>
            {pixTimerActive && pixTimer > 0 && (
              <View style={styles.timerContainer}>
                <View style={styles.timerCircle}>
                  <Text style={styles.timerText}>{formatTime(pixTimer)}</Text>
                </View>
                <Text style={styles.timerLabel}>Tempo restante</Text>
              </View>
            )}
          </View>

          {/* Instruções */}
          <Text style={styles.pixInstructions}>
            Escaneie o QR Code abaixo com seu app bancário ou Mercado Pago
          </Text>

          {/* QR Code Container */}
          <View style={styles.qrCodeContainer}>
            <Image
              source={{ uri: `data:image/png;base64,${paymentResponse.qr_code_base64}` }}
              style={styles.qrCode}
              resizeMode="contain"
            />
            
            {/* Overlay quando timer expira */}
            {pixTimer === 0 && (
              <View style={styles.qrCodeOverlay}>
                <Text style={styles.expiredText}>QR Code Expirado</Text>
                <Text style={styles.expiredSubtext}>Inicie um novo pagamento</Text>
              </View>
            )}
          </View>

          {/* Botão Copiar Código */}
          <TouchableOpacity 
            onPress={handleCopyPixCode} 
            style={[styles.copyButton, pixTimer === 0 && styles.copyButtonDisabled]}
            disabled={pixTimer === 0}
          >
            <Text style={styles.copyButtonText}>Copiar código PIX</Text>
          </TouchableOpacity>

          {/* Feedback de cópia */}
          <Animated.View style={{ opacity: fadeAnim, marginTop: 8 }}>
            {copied && (
              <View style={styles.copiedContainer}>
                <Text style={styles.copiedText}>✓ Código copiado!</Text>
              </View>
            )}
          </Animated.View>

          {/* Status do pagamento */}
          {polling && paymentStatus === 'pending' && (
            <View style={styles.statusContainer}>
              <ActivityIndicator size="small" color="#e5293e" />
              <Text style={styles.statusText}>Aguardando pagamento...</Text>
            </View>
          )}

          {paymentStatus === 'approved' && (
            <Animated.View style={{ opacity: fadeAnim }}>
              <View style={styles.successContainer}>
                <Text style={styles.successText}>✓ Pagamento aprovado!</Text>
                <Text style={styles.successSubtext}>Seu pedido está sendo processado</Text>
              </View>
            </Animated.View>
          )}

          {paymentStatus === 'rejected' && (
            <Animated.View style={{ opacity: fadeAnim }}>
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>✗ Pagamento rejeitado</Text>
                <Text style={styles.errorSubtext}>Tente novamente</Text>
              </View>
            </Animated.View>
          )}

          {/* Instruções adicionais */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionTitle}>Como pagar:</Text>
            <Text style={styles.instructionText}>• Abra seu app bancário</Text>
            <Text style={styles.instructionText}>• Escaneie o QR Code ou cole o código</Text>
            <Text style={styles.instructionText}>• Confirme o pagamento</Text>
          </View>
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
            {cardError ? (
              <View style={styles.modalFeedbackContainer}>
                <View style={styles.modalFeedbackError}>
                  <Text style={styles.modalFeedbackIcon}>⚠️</Text>
                  <Text style={styles.modalFeedbackErrorText}>{cardError}</Text>
                </View>
              </View>
            ) : null}
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
              // Limpar estados de erro para não impedir confirmação
              limparEstadosDeErro();
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
                    setPaymentMethodSelected(true);
                    setShowCardSelectionModal(false);
                    setSuccess('Cartão selecionado com sucesso!');
                  }}
                  disabled={!savedCardCvv}
                >
                  <Text style={styles.modalButtonTextPrimary}>
                    Usar Cartão Selecionado
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            <Pressable style={{ marginTop: 8, alignSelf: 'center' }} onPress={() => {
              setShowCardSelectionModal(false);
              // Limpar estados de erro para não impedir confirmação
              limparEstadosDeErro();
            }}>
              <Text style={{ color: '#e5293e', fontWeight: 'bold' }}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      
      {/* Modal de Pagamento na Entrega */}
      <Modal visible={showDeliveryPaymentModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 24, width: 320 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8, color: '#e5293e' }}>Pagamento na Entrega</Text>
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>
              Selecione como deseja pagar na entrega:
            </Text>
            <Text style={{ fontSize: 12, color: '#999', marginBottom: 20, fontStyle: 'italic' }}>
              ⚠️ Você deve selecionar uma opção para continuar
            </Text>
            
            {/* Opções de pagamento */}
            <View style={{ marginBottom: 20 }}>
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
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#333' }}>Precisa de troco?</Text>
                
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
                  <View style={{ marginTop: 12 }}>
                    <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>Troco para quanto?</Text>
                    <TextInput
                      style={styles.trocoInput}
                      placeholder="Ex: 50.00"
                      value={trocoParaQuanto}
                      onChangeText={setTrocoParaQuanto}
                      keyboardType="numeric"
                    />
                    <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                      Total do pedido: R$ {(calculateSubtotal() + taxaEntrega).toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Botões */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={handleCancelDeliveryPayment}
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
      
      {/* Modal de Adicionar Endereço */}
      <Modal visible={showAddressModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 24, width: '90%', maxHeight: '80%' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8, color: '#e5293e' }}>Adicionar Endereço</Text>
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>
              Preencha os dados do seu endereço:
            </Text>
            
            {addressModalError && (
              <View style={styles.modalFeedbackContainer}>
                <View style={styles.modalFeedbackError}>
                  <Text style={styles.modalFeedbackIcon}>⚠️</Text>
                  <Text style={styles.modalFeedbackErrorText}>{addressModalError}</Text>
                </View>
              </View>
            )}
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={styles.modalInput}
                placeholder="Nome do endereço (ex: Casa, Trabalho)"
                value={newAddressLabel}
                onChangeText={setNewAddressLabel}
              />
              
              <TextInput
                style={styles.modalInput}
                placeholder="Rua, Avenida, etc."
                value={newAddressStreet}
                onChangeText={setNewAddressStreet}
              />
              
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TextInput
                  style={[styles.modalInput, { flex: 1 }]}
                  placeholder="Número"
                  value={newAddressNumber}
                  onChangeText={setNewAddressNumber}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.modalInput, { flex: 2 }]}
                  placeholder="Complemento (opcional)"
                  value={newAddressComplement}
                  onChangeText={setNewAddressComplement}
                />
              </View>
              
              <TextInput
                style={styles.modalInput}
                placeholder="Bairro"
                value={newAddressNeighborhood}
                onChangeText={setNewAddressNeighborhood}
              />
              
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TextInput
                  style={[styles.modalInput, { flex: 2 }]}
                  placeholder="Cidade"
                  value={newAddressCity}
                  onChangeText={setNewAddressCity}
                />
                <TextInput
                  style={[styles.modalInput, { flex: 1 }]}
                  placeholder="UF"
                  value={newAddressState}
                  onChangeText={setNewAddressState}
                  maxLength={2}
                />
              </View>
              
              <TextInput
                style={styles.modalInput}
                placeholder="CEP"
                value={newAddressZipCode}
                onChangeText={setNewAddressZipCode}
                keyboardType="numeric"
                maxLength={8}
              />
            </ScrollView>
            
            {/* Botões */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setShowAddressModal(false);
                  setAddressModalError(null);
                  setNewAddressLabel('');
                  setNewAddressStreet('');
                  setNewAddressNumber('');
                  setNewAddressComplement('');
                  setNewAddressNeighborhood('');
                  setNewAddressCity('');
                  setNewAddressState('');
                  setNewAddressZipCode('');
                }}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleAddAddress}
                disabled={loading}
              >
                <Text style={styles.modalButtonTextPrimary}>
                  {loading ? 'Salvando...' : 'Salvar Endereço'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
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
  payButtonWarning: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
  },
  payButtonTextWarning: {
    color: '#856404',
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
  
  // Estilos para interface PIX melhorada
  pixPaymentContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginVertical: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  pixHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pixTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e5293e',
  },
  timerContainer: {
    alignItems: 'center',
  },
  timerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e5293e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    shadowColor: '#e5293e',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  timerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timerLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  pixInstructions: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  qrCode: {
    width: 220,
    height: 220,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#e5293e',
    backgroundColor: '#fff',
  },
  qrCodeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expiredText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  expiredSubtext: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
  },
  copyButton: {
    backgroundColor: '#e5293e',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#e5293e',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  copyButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  copiedContainer: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  copiedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  statusText: {
    color: '#e5293e',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  successContainer: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  successText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  successSubtext: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  errorContainer: {
    backgroundColor: '#f44336',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  errorSubtext: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  instructionsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  
  // Estilos para resumo do pedido melhorado
  orderSummaryContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  orderItemPrice: {
    fontSize: 14,
    color: '#e5293e',
    fontWeight: 'bold',
  },
  orderItemQuantity: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5293e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 12,
  },
  totalsContainer: {
    paddingTop: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  totalRowFinal: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  totalLabelFinal: {
    fontSize: 18,
    color: '#333',
    fontWeight: 'bold',
  },
  totalValueFinal: {
    fontSize: 18,
    color: '#e5293e',
    fontWeight: 'bold',
  },
  successMessage: {
    backgroundColor: '#d4edda',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  successMessageText: {
    color: '#155724',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Estilos para botões de pagamento desabilitados
  payButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
    opacity: 0.6,
  },
  payButtonTextDisabled: {
    color: '#999',
  },
  
  // Estilos para modal de pagamento na entrega
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
  trocoInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  // Feedback Messages Styles
  feedbackContainer: {
    marginVertical: 12,
    marginHorizontal: 4,
  },
  feedbackError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  feedbackSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  feedbackIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  feedbackErrorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#dc2626',
    lineHeight: 20,
  },
  feedbackSuccessText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#16a34a',
    lineHeight: 20,
  },
  // Modal Feedback Styles
  modalFeedbackContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  modalFeedbackError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalFeedbackIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  modalFeedbackErrorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#dc2626',
    lineHeight: 18,
  },
  // Address Management Styles
  manageAddressButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e5293e',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  manageAddressButtonText: {
    color: '#e5293e',
    fontWeight: '600',
    fontSize: 14,
  },
  noAddressContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 16,
  },
  // Address Card Styles
  noAddressCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  noAddressIcon: {
    fontSize: 48,
    marginBottom: 12,
    color: '#e5293e',
  },
  noAddressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  noAddressSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  addAddressButton: {
    backgroundColor: '#e5293e',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#e5293e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addAddressButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal Input Styles
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
  // Empty Cart Styles
  emptyCartContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  emptyCartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  emptyCartIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.6,
  },
  emptyCartTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyCartSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyCartButton: {
    backgroundColor: '#e5293e',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowColor: '#e5293e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyCartButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Empty Order Summary Styles
  emptyOrderSummary: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  emptyOrderIcon: {
    fontSize: 32,
    marginBottom: 8,
    opacity: 0.6,
  },
  emptyOrderText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
});

export default CheckoutScreen;

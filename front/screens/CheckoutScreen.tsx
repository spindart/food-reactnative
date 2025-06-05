import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, Pressable, Image, ActivityIndicator } from 'react-native';
import { createOrder } from '../services/orderService';
import { useCart } from '../context/CartContext';
import { getCurrentUser } from '../services/currentUserService';
import { useRoute } from '@react-navigation/native';
import { pagarComMercadoPago, consultarStatusPagamento } from '../services/mercadopagoService';
import * as Clipboard from 'expo-clipboard';
import { Animated } from 'react-native';

const CheckoutScreen: React.FC = () => {
  const { state: cartState, dispatch } = useCart();
  const route = useRoute<any>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [endereco, setEndereco] = useState('Rua Exemplo, 123');
  const [pagamento, setPagamento] = useState<'dinheiro' | 'cartao' | 'pix'>('dinheiro');
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardError, setCardError] = useState('');
  const [paymentResponse, setPaymentResponse] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [polling, setPolling] = useState(false);
  const [pixTimer, setPixTimer] = useState(300); // 5 minutos
  const [copied, setCopied] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const taxaEntrega = 5.99;

  React.useEffect(() => {
    getCurrentUser().then((user) => {
      setUserId(user?.id ? String(user.id) : null);
    });
    if (route.params?.estabelecimentoId) {
      setEstabelecimentoId(String(route.params.estabelecimentoId));
    }
  }, [route.params]);

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
    } catch (e) {
      setPaymentStatus('rejected');
    } finally {
      setPolling(false);
    }
  }

  // Efeito para polling do status do pagamento PIX
  React.useEffect(() => {
    if (paymentResponse && paymentResponse.id && paymentResponse.status === 'pending') {
      setPaymentStatus('pending');
      const interval = setInterval(() => {
        checkPaymentStatus(paymentResponse.id);
      }, 4000);
      return () => clearInterval(interval);
    }
    if (paymentResponse && paymentResponse.status) {
      setPaymentStatus(paymentResponse.status);
    }
  }, [paymentResponse]);

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
    if (paymentResponse?.point_of_interaction?.transaction_data?.qr_code) {
      Clipboard.setStringAsync(paymentResponse.point_of_interaction.transaction_data.qr_code);
      setCopied(true);
    }
  };

  const handleConfirmOrder = async () => {
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
        // Integração Mercado Pago PIX
        const mpResp = await pagarComMercadoPago({
          amount: Number(calculateTotal()),
          description: `Pedido em ${estabelecimentoId}`,
          payerEmail: 'cliente@ifood.com', // Trocar pelo e-mail real do usuário
        });
        setPaymentResponse(mpResp);
        setSuccess('Pagamento PIX iniciado! Veja o QR Code abaixo.');
      } catch (error) {
        setError('Erro ao iniciar pagamento PIX.');
      } finally {
        setLoading(false);
      }
      return;
    }
    if (pagamento === 'cartao') {
      // Validação simples
      if (!cardNumber || !cardName || !cardExp || !cardCvv) {
        setCardError('Preencha todos os dados do cartão.');
        setShowCardModal(true);
        return;
      }
      // Aqui você faria a chamada real ao gateway de pagamento
      // Exemplo: await processarPagamentoCartao({ cardNumber, cardName, cardExp, cardCvv, valor: calculateTotal() })
      // Simulação:
      await new Promise((res) => setTimeout(res, 1200));
      setCardError('');
      setShowCardModal(false);
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
      const payload = {
        clienteId: userId,
        estabelecimentoId,
        itens: cartItems.map((item) => ({
          produtoId: item.id,
          quantidade: item.quantidade,
          precoUnitario: item.preco,
        })),
        endereco,
        pagamento,
        dadosCartao: pagamento === 'cartao' ? { cardNumber, cardName, cardExp, cardCvv } : undefined,
      };
      const response = await createOrder(payload);
      setSuccess('Pedido confirmado!');
      dispatch({ type: 'CLEAR_CART' });
    } catch (error) {
      setError('Erro ao confirmar pedido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Endereço de entrega</Text>
      <TextInput
        style={styles.input}
        value={endereco}
        onChangeText={setEndereco}
        placeholder="Digite o endereço"
      />
      <Text style={styles.sectionTitle}>Forma de pagamento</Text>
      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        <TouchableOpacity style={[styles.payButton, pagamento === 'dinheiro' && styles.payButtonSelected]} onPress={() => setPagamento('dinheiro')}>
          <Text style={[styles.payButtonText, pagamento === 'dinheiro' && styles.payButtonTextSelected]}>Pagar na entrega</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.payButton, pagamento === 'cartao' && styles.payButtonSelected]} onPress={() => { setPagamento('cartao'); setShowCardModal(true); }}>
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
            <Text style={styles.details}>Qtd: {item.quantidade}</Text>
            <Text style={styles.details}>R$ {(item.preco * item.quantidade).toFixed(2)}</Text>
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
      <TouchableOpacity style={styles.button} onPress={handleConfirmOrder} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Enviando...' : 'Confirmar Pedido'}</Text>
      </TouchableOpacity>
      {paymentResponse && paymentResponse.point_of_interaction && paymentResponse.point_of_interaction.transaction_data && paymentResponse.point_of_interaction.transaction_data.qr_code_base64 && (
        <View style={{ alignItems: 'center', marginVertical: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}>
          <Text style={{ fontWeight: 'bold', color: '#e5293e', marginBottom: 8, fontSize: 16 }}>Escaneie o QR Code PIX para pagar</Text>
          <Image
            source={{ uri: `data:image/png;base64,${paymentResponse.point_of_interaction.transaction_data.qr_code_base64}` }}
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
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Validade (MM/AA)" value={cardExp} onChangeText={setCardExp} maxLength={5} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="CVV" value={cardCvv} onChangeText={setCardCvv} maxLength={4} secureTextEntry />
            </View>
            {cardError ? <Text style={{ color: 'red', marginTop: 4 }}>{cardError}</Text> : null}
            <TouchableOpacity style={[styles.button, { marginTop: 12 }]} onPress={() => { setCardError(''); setShowCardModal(false); }}>
              <Text style={styles.buttonText}>Salvar cartão</Text>
            </TouchableOpacity>
            <Pressable style={{ marginTop: 8, alignSelf: 'center' }} onPress={() => setShowCardModal(false)}>
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
});

export default CheckoutScreen;

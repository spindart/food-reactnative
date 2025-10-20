import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Image,
  Share,
  Linking,
  ScrollView,
  Dimensions
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { consultarStatusPagamento } from '../services/pixService';
import { createOrder } from '../services/orderService';
import { useCart } from '../context/CartContext';
import * as Clipboard from 'expo-clipboard';

const { width } = Dimensions.get('window');

interface PixPaymentData {
  paymentId: string;
  qr_code: string;
  qr_code_base64: string;
  ticket_url?: string;
  status: string;
}

interface RouteParams {
  pixData: PixPaymentData;
  orderData: {
    userId: string;
    estabelecimentoId: string;
    cartItems: any[];
    total: number;
    endereco: string;
    taxaEntrega: number;
  };
}

const PixPaymentConfirmationScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { dispatch } = useCart();
  
  const { pixData, orderData } = route.params as RouteParams;
  
  const [paymentStatus, setPaymentStatus] = useState<string>(pixData.status);
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutos = 600 segundos
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          Alert.alert(
            'Tempo Expirado',
            'O tempo para pagamento expirou. Você será redirecionado para o carrinho.',
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack()
              }
            ]
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Polling do status do pagamento
  useEffect(() => {
    if (paymentStatus === 'pending') {
      const interval = setInterval(async () => {
        try {
          setIsPolling(true);
          const response = await consultarStatusPagamento(pixData.paymentId);
          setPaymentStatus(response.status);
          
          if (response.status === 'approved') {
            clearInterval(interval);
            await handlePaymentApproved();
          }
        } catch (error) {
          console.error('Erro ao verificar status do pagamento:', error);
        } finally {
          setIsPolling(false);
        }
      }, 3000); // Verifica a cada 3 segundos

      return () => clearInterval(interval);
    }
  }, [paymentStatus]);

  const handlePaymentApproved = async () => {
    try {
      setIsCreatingOrder(true);
      
      // Criar o pedido após pagamento aprovado
      const payload = {
        clienteId: Number(orderData.userId),
        estabelecimentoId: Number(orderData.estabelecimentoId),
        produtos: orderData.cartItems.map((item) => ({
          produtoId: Number(item.id),
          quantidade: item.quantidade
        })),
        formaPagamento: 'pix',
        total: orderData.total,
        // Informações de pagamento aprovado
        paymentId: pixData.paymentId,
        paymentStatus: 'approved',
        paymentMethod: 'pix',
        // Endereço de entrega
        enderecoEntrega: orderData.endereco,
        taxaEntrega: orderData.taxaEntrega,
      };
      
      console.log('Criando pedido após pagamento PIX aprovado:', payload);
      const response = await createOrder(payload);
      console.log('Pedido criado com sucesso:', response);
      
      // Limpar carrinho
      dispatch({ type: 'CLEAR_CART' });
      
      Alert.alert(
        'Pagamento Aprovado!',
        'Seu pedido foi confirmado e está sendo preparado.',
        [
          {
            text: 'Ver Pedidos',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'HomeTabs' as never, params: { screen: 'Pedidos' } }],
              });
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      Alert.alert(
        'Erro',
        'Pagamento aprovado, mas houve erro ao criar o pedido. Entre em contato com o suporte.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await Clipboard.setStringAsync(pixData.qr_code);
      setCopied(true);
      Alert.alert('Código Copiado', 'O código PIX foi copiado para a área de transferência!');
      
      // Reset copied state after 3 seconds
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível copiar o código');
    }
  };

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Código PIX para pagamento:\n\n${pixData.qr_code}\n\nValor: R$ ${orderData.total.toFixed(2)}`,
        title: 'Código PIX - Pagamento'
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };

  const handleOpenTicket = () => {
    if (pixData.ticket_url) {
      Linking.openURL(pixData.ticket_url);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    switch (paymentStatus) {
      case 'approved':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'rejected':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusText = () => {
    switch (paymentStatus) {
      case 'approved':
        return 'Pagamento Aprovado';
      case 'pending':
        return 'Aguardando Pagamento';
      case 'rejected':
        return 'Pagamento Rejeitado';
      default:
        return 'Status Desconhecido';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Fixo */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pagamento PIX</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status e Timer Compacto */}
        <View style={styles.statusSection}>
          <View style={styles.statusRow}>
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]}>
              <Text style={styles.statusIcon}>
                {paymentStatus === 'approved' ? '✅' : 
                 paymentStatus === 'pending' ? '⏳' : '❌'}
              </Text>
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusText}>{getStatusText()}</Text>
              <Text style={styles.valueAmount}>R$ {orderData.total.toFixed(2)}</Text>
            </View>
            {paymentStatus === 'pending' && (
              <View style={styles.timerCompact}>
                <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
                <Text style={styles.timerLabel}>restante</Text>
              </View>
            )}
          </View>
        </View>

        {/* QR Code Compacto */}
        {pixData.qr_code_base64 && (
          <View style={styles.qrSection}>
            <Text style={styles.sectionTitle}>Escaneie o QR Code</Text>
            <View style={styles.qrContainer}>
              <Image
                source={{ uri: `data:image/png;base64,${pixData.qr_code_base64}` }}
                style={styles.qrCode}
                resizeMode="contain"
              />
            </View>
          </View>
        )}

        {/* Código PIX Compacto */}
        <View style={styles.codeSection}>
          <Text style={styles.sectionTitle}>Ou cole o código PIX</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText} numberOfLines={3}>
              {pixData.qr_code}
            </Text>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={handleCopyCode}
              disabled={copied}
            >
              <Text style={styles.copyButtonText}>
                {copied ? '✓ Copiado' : '📋 Copiar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Instruções Compactas */}
        <View style={styles.instructionsSection}>
          <Text style={styles.sectionTitle}>Como pagar:</Text>
          <View style={styles.stepsContainer}>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>Abra o app do seu banco</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>Escaneie o QR Code ou cole o código</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>Confirme o pagamento</Text>
            </View>
          </View>
        </View>

        {/* Botões de Ação Compactos */}
        <View style={styles.actionsSection}>
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleCopyCode}
            >
              <Text style={styles.actionButtonText}>📋 Copiar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handleShareCode}
            >
              <Text style={styles.actionButtonText}>📤 Compartilhar</Text>
            </TouchableOpacity>
          </View>
          
          {pixData.ticket_url && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.tertiaryButton]}
              onPress={handleOpenTicket}
            >
              <Text style={styles.actionButtonText}>🌐 Abrir no Navegador</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Aviso Compacto */}
        {paymentStatus === 'pending' && (
          <View style={styles.warningSection}>
            <Text style={styles.warningText}>
              ⚠️ Tempo restante: {formatTime(timeLeft)} - Após expirar, o pedido será cancelado
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Loading Indicator */}
      {(isPolling || isCreatingOrder) && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#e5293e" />
            <Text style={styles.loadingText}>
              {isCreatingOrder ? 'Criando pedido...' : 'Verificando pagamento...'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    fontSize: 20,
    color: '#e5293e',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  
  // Status Section - Compacto
  statusSection: {
    backgroundColor: '#fff',
    marginBottom: 12,
    paddingVertical: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  statusIndicator: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusIcon: {
    fontSize: 20,
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  valueAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e5293e',
  },
  timerCompact: {
    alignItems: 'center',
    backgroundColor: '#e5293e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timerLabel: {
    color: '#fff',
    fontSize: 10,
    opacity: 0.8,
  },

  // QR Section - Compacto
  qrSection: {
    backgroundColor: '#fff',
    marginBottom: 12,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  qrContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  qrCode: {
    width: Math.min(width * 0.6, 180),
    height: Math.min(width * 0.6, 180),
  },

  // Code Section - Compacto
  codeSection: {
    backgroundColor: '#fff',
    marginBottom: 12,
    paddingVertical: 16,
  },
  codeBox: {
    backgroundColor: '#f8f9fa',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 11,
    color: '#333',
    fontFamily: 'monospace',
    lineHeight: 16,
    marginBottom: 8,
  },
  copyButton: {
    backgroundColor: '#e5293e',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-end',
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Instructions Section - Compacto
  instructionsSection: {
    backgroundColor: '#fff',
    marginBottom: 12,
    paddingVertical: 16,
  },
  stepsContainer: {
    paddingHorizontal: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5293e',
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },

  // Actions Section - Compacto
  actionsSection: {
    backgroundColor: '#fff',
    marginBottom: 12,
    paddingVertical: 16,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  primaryButton: {
    backgroundColor: '#e5293e',
  },
  secondaryButton: {
    backgroundColor: '#28a745',
  },
  tertiaryButton: {
    backgroundColor: '#17a2b8',
    marginHorizontal: 16,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },

  // Warning Section - Compacto
  warningSection: {
    backgroundColor: '#fff3cd',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  warningText: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
    lineHeight: 16,
  },

  // Loading Overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
});

export default PixPaymentConfirmationScreen;

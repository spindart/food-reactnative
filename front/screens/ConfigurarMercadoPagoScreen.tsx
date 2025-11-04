// Tela de Configuração do Mercado Pago para Estabelecimento
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getMarketplaceOAuthStatus,
  getMarketplaceAuthorizationUrl,
  disconnectMarketplaceAccount,
  refreshMarketplaceToken,
  MarketplaceOAuthStatus,
} from '../services/marketplaceService';

const ConfigurarMercadoPagoScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { estabelecimento } = route.params;

  const [status, setStatus] = useState<MarketplaceOAuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStatus();
  }, [estabelecimento.id]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const estabelecimentoId = typeof estabelecimento.id === 'string' 
        ? parseInt(estabelecimento.id, 10) 
        : estabelecimento.id;
      const data = await getMarketplaceOAuthStatus(estabelecimentoId);
      setStatus(data);
    } catch (error: any) {
      console.error('Erro ao carregar status:', error);
      Alert.alert('Erro', 'Não foi possível carregar o status da conta Mercado Pago.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const estabelecimentoId = typeof estabelecimento.id === 'string' 
        ? parseInt(estabelecimento.id, 10) 
        : estabelecimento.id;
      const { authorizationUrl } = await getMarketplaceAuthorizationUrl(
        estabelecimentoId
      );

      // Abrir URL no navegador
      const supported = await Linking.canOpenURL(authorizationUrl);
      if (supported) {
        await Linking.openURL(authorizationUrl);
        Alert.alert(
          'Autorização Necessária',
          'Você será redirecionado para autorizar a conexão com sua conta Mercado Pago. Após autorizar, volte para o app.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Aguardar um pouco e recarregar o status
                setTimeout(() => {
                  loadStatus();
                }, 2000);
              },
            },
          ]
        );
      } else {
        Alert.alert('Erro', 'Não foi possível abrir a URL de autorização.');
      }
    } catch (error: any) {
      console.error('Erro ao conectar:', error);
      Alert.alert(
        'Erro',
        error.response?.data?.error || 'Não foi possível iniciar a conexão.'
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Desconectar Conta',
      'Tem certeza que deseja desconectar sua conta Mercado Pago? Você precisará reconectar para receber pagamentos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: async () => {
            try {
              setRefreshing(true);
              const estabelecimentoId = typeof estabelecimento.id === 'string' 
                ? parseInt(estabelecimento.id, 10) 
                : estabelecimento.id;
              await disconnectMarketplaceAccount(estabelecimentoId);
              Alert.alert('Sucesso', 'Conta desconectada com sucesso.');
              await loadStatus();
            } catch (error: any) {
              console.error('Erro ao desconectar:', error);
              Alert.alert(
                'Erro',
                error.response?.data?.error || 'Não foi possível desconectar a conta.'
              );
            } finally {
              setRefreshing(false);
            }
          },
        },
      ]
    );
  };

  const handleRefreshToken = async () => {
    try {
      setRefreshing(true);
      const estabelecimentoId = typeof estabelecimento.id === 'string' 
        ? parseInt(estabelecimento.id, 10) 
        : estabelecimento.id;
      await refreshMarketplaceToken(estabelecimentoId);
      Alert.alert('Sucesso', 'Token renovado com sucesso.');
      await loadStatus();
    } catch (error: any) {
      console.error('Erro ao renovar token:', error);
      Alert.alert(
        'Erro',
        error.response?.data?.error || 'Não foi possível renovar o token.'
      );
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const estabelecimentoData = status?.estabelecimento;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Mercado Pago</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons
              name={
                estabelecimentoData?.mercadoPagoConnected
                  ? 'checkmark-circle'
                  : 'close-circle'
              }
              size={32}
              color={
                estabelecimentoData?.mercadoPagoConnected ? '#4CAF50' : '#F44336'
              }
            />
            <Text style={styles.cardTitle}>
              {estabelecimentoData?.mercadoPagoConnected
                ? 'Conta Conectada'
                : 'Conta Não Conectada'}
            </Text>
          </View>

          {estabelecimentoData?.mercadoPagoConnected ? (
            <>
              {/* Informações da Conta Conectada */}
              <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>ID da Conta:</Text>
                  <Text style={styles.infoValue}>
                    {estabelecimentoData.mercadoPagoCollectorId || 'N/A'}
                  </Text>
                </View>

                {estabelecimentoData.mercadoPagoConnectedAt && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Conectado em:</Text>
                    <Text style={styles.infoValue}>
                      {new Date(
                        estabelecimentoData.mercadoPagoConnectedAt
                      ).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Taxa de Comissão:</Text>
                  <Text style={styles.infoValue}>
                    {estabelecimentoData.applicationFeePercent}%
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Status do Token:</Text>
                  <View style={styles.tokenStatus}>
                    <Ionicons
                      name={
                        estabelecimentoData.tokenValid
                          ? 'checkmark-circle'
                          : 'warning'
                      }
                      size={16}
                      color={
                        estabelecimentoData.tokenValid ? '#4CAF50' : '#FF9800'
                      }
                    />
                    <Text
                      style={[
                        styles.tokenStatusText,
                        {
                          color: estabelecimentoData.tokenValid
                            ? '#4CAF50'
                            : '#FF9800',
                        },
                      ]}
                    >
                      {estabelecimentoData.tokenValid
                        ? 'Válido'
                        : 'Necessita Renovação'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Botões de Ação */}
              <View style={styles.buttonContainer}>
                {!estabelecimentoData.tokenValid && (
                  <TouchableOpacity
                    style={[styles.button, styles.refreshButton]}
                    onPress={handleRefreshToken}
                    disabled={refreshing}
                  >
                    {refreshing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="refresh" size={20} color="#fff" />
                        <Text style={styles.buttonText}>Renovar Token</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.button, styles.disconnectButton]}
                  onPress={handleDisconnect}
                  disabled={refreshing}
                >
                  <Ionicons name="unlink" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Desconectar</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Instruções para Conectar */}
              <View style={styles.infoSection}>
                <Text style={styles.infoText}>
                  Para receber pagamentos automaticamente, você precisa conectar
                  sua conta Mercado Pago ao estabelecimento.
                </Text>
                <Text style={styles.infoText}>
                  Ao conectar, você autoriza que recebamos pagamentos em seu nome
                  e que cobremos uma taxa de comissão de{' '}
                  {estabelecimentoData?.applicationFeePercent || 12}% por pedido.
                </Text>
              </View>

              {/* Botão de Conectar */}
              <TouchableOpacity
                style={[styles.button, styles.connectButton]}
                onPress={handleConnect}
                disabled={connecting}
              >
                {connecting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="link" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Conectar Conta</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Informações Adicionais */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#007AFF" />
          <View style={styles.infoCardContent}>
            <Text style={styles.infoCardTitle}>Como Funciona?</Text>
            <Text style={styles.infoCardText}>
              • Quando um cliente faz um pedido, o pagamento é processado
              automaticamente{'\n'}
              • Você recebe o valor do pedido menos a taxa de comissão{'\n'}
              • O valor é creditado diretamente na sua conta Mercado Pago{'\n'}
              • Você pode acompanhar todas as transações no painel do Mercado
              Pago
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
    color: '#000',
  },
  infoSection: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  tokenStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenStatusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  connectButton: {
    backgroundColor: '#007AFF',
  },
  disconnectButton: {
    backgroundColor: '#F44336',
  },
  refreshButton: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoCardText: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
});

export default ConfigurarMercadoPagoScreen;


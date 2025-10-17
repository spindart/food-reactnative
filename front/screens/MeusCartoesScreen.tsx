import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getCartoes, removerCartao, definirCartaoPadrao, adicionarCartao, Cartao, formatarCartao, getBandeiraIcon } from '../services/cartaoService';
import { getCurrentUser } from '../services/currentUserService';
import { generateCardToken } from '../services/cardPaymentService';

const MeusCartoesScreen: React.FC = () => {
  const navigation = useNavigation();
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingCard, setAddingCard] = useState(false);

  // Estados para o formulário de adicionar cartão
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardError, setCardError] = useState('');

  useEffect(() => {
    carregarCartoes();
  }, []);

  // Recarregar cartões sempre que a tela ganhar foco
  useFocusEffect(
    React.useCallback(() => {
      carregarCartoes();
    }, [])
  );

  const carregarCartoes = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user?.id) {
        setError('Usuário não autenticado');
        return;
      }
      
      const cartoesData = await getCartoes(user.id);
      console.log('📱 MeusCartoesScreen - Cartões carregados:', cartoesData);
      setCartoes(cartoesData);
    } catch (err) {
      setError('Erro ao carregar cartões');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoverCartao = async (cartaoId: number) => {
    Alert.alert(
      'Remover Cartão',
      'Tem certeza que deseja remover este cartão?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await removerCartao(cartaoId);
              await carregarCartoes();
              Alert.alert('Sucesso', 'Cartão removido com sucesso');
            } catch (err) {
              Alert.alert('Erro', 'Erro ao remover cartão');
            }
          }
        }
      ]
    );
  };

  const handleDefinirPadrao = async (cartaoId: number) => {
    try {
      const user = await getCurrentUser();
      if (!user?.id) return;
      
      await definirCartaoPadrao(cartaoId, user.id);
      await carregarCartoes();
      Alert.alert('Sucesso', 'Cartão definido como padrão');
    } catch (err) {
      Alert.alert('Erro', 'Erro ao definir cartão padrão');
    }
  };

  const handleAdicionarCartao = async () => {
    if (!cardNumber || !cardName || !cardExp || !cardCvv) {
      setCardError('Preencha todos os campos');
      return;
    }

    try {
      setAddingCard(true);
      setCardError('');

      const user = await getCurrentUser();
      if (!user?.id) {
        setCardError('Usuário não autenticado');
        return;
      }

      // Gerar token do cartão
      const token = await generateCardToken({ cardNumber, cardExp, cardCvv, cardName });

      // Adicionar cartão
      await adicionarCartao({
        usuarioId: user.id,
        token,
        cardNumber,
        cardExp,
        cardCvv,
        cardName
      });

      await carregarCartoes();
      setShowAddModal(false);
      limparFormulario();
      Alert.alert('Sucesso', 'Cartão adicionado com sucesso');
    } catch (err: any) {
      setCardError(err.message || 'Erro ao adicionar cartão');
    } finally {
      setAddingCard(false);
    }
  };

  const limparFormulario = () => {
    setCardNumber('');
    setCardName('');
    setCardExp('');
    setCardCvv('');
    setCardError('');
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

  const renderCartao = ({ item }: { item: Cartao }) => (
    <View style={styles.cartaoCard}>
      <View style={styles.cartaoHeader}>
        <View style={styles.cartaoInfo}>
          <Text style={styles.bandeiraIcon}>{getBandeiraIcon(item.paymentMethodId)}</Text>
          <View>
            <Text style={styles.bandeiraNome}>{item.paymentMethodId.toUpperCase()}</Text>
            <Text style={styles.cartaoNumero}>****{item.lastFourDigits}</Text>
          </View>
        </View>
        {item.isDefault && (
          <View style={styles.padraoBadge}>
            <Text style={styles.padraoText}>PADRÃO</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.validade}>
        Válido até {item.expirationMonth.toString().padStart(2, '0')}/{item.expirationYear.toString().slice(-2)}
      </Text>
      
      <View style={styles.cartaoActions}>
        {!item.isDefault && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDefinirPadrao(item.id)}
          >
            <Ionicons name="star-outline" size={20} color="#e5293e" />
            <Text style={styles.actionText}>Definir como padrão</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.actionButton, styles.removeButton]}
          onPress={() => handleRemoverCartao(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#e74c3c" />
          <Text style={[styles.actionText, styles.removeText]}>Remover</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e5293e" />
        <Text style={styles.loadingText}>Carregando cartões...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#e5293e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meus Cartões</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#e5293e" />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {cartoes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="card-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>Nenhum cartão cadastrado</Text>
          <Text style={styles.emptySubtitle}>Adicione um cartão para facilitar seus pagamentos</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.emptyButtonText}>Adicionar Cartão</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={cartoes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCartao}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal para adicionar cartão */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adicionar Cartão</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Número do cartão"
                value={cardNumber}
                onChangeText={setCardNumber}
                keyboardType="numeric"
                maxLength={19}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Nome impresso no cartão"
                value={cardName}
                onChangeText={setCardName}
              />
              
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Validade (MM/AA)"
                  value={cardExp}
                  onChangeText={(text) => setCardExp(formatCardExp(text))}
                  maxLength={5}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="CVV"
                  value={cardCvv}
                  onChangeText={setCardCvv}
                  maxLength={4}
                  secureTextEntry
                  keyboardType="numeric"
                />
              </View>

              {cardError && (
                <Text style={styles.errorText}>{cardError}</Text>
              )}

              <TouchableOpacity
                style={[styles.saveButton, addingCard && styles.disabledButton]}
                onPress={handleAdicionarCartao}
                disabled={addingCard}
              >
                {addingCard ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Adicionar Cartão</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    padding: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#fee',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fcc',
  },
  errorText: {
    color: '#c33',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#e5293e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  list: {
    padding: 16,
  },
  cartaoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cartaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cartaoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bandeiraIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  bandeiraNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cartaoNumero: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  padraoBadge: {
    backgroundColor: '#e5293e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  padraoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  validade: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  cartaoActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
  },
  actionText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#e5293e',
    fontWeight: '500',
  },
  removeButton: {
    backgroundColor: '#fee',
  },
  removeText: {
    color: '#e74c3c',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  form: {
    padding: 20,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  saveButton: {
    backgroundColor: '#e5293e',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MeusCartoesScreen;

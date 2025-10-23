import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { getEnderecos, addEndereco } from '../services/enderecoService';
import { useCart } from '../context/CartContext';
import { getEstabelecimentoById } from '../services/estabelecimentoService';

const EnderecoEntregaScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { state: cartState } = useCart();
  const [enderecos, setEnderecos] = useState<any[]>([]);
  const [enderecoSelecionado, setEnderecoSelecionado] = useState<any>(null);
  const [opcaoEntrega, setOpcaoEntrega] = useState<'padrao' | 'retirada'>('padrao');
  const [taxaEntrega, setTaxaEntrega] = useState(0);
  const [showAddressModal, setShowAddressModal] = useState(false);
  
  // Estados para novo endereço
  const [newAddressLabel, setNewAddressLabel] = useState('');
  const [newAddressStreet, setNewAddressStreet] = useState('');
  const [newAddressNumber, setNewAddressNumber] = useState('');
  const [newAddressComplement, setNewAddressComplement] = useState('');
  const [newAddressNeighborhood, setNewAddressNeighborhood] = useState('');
  const [newAddressCity, setNewAddressCity] = useState('');
  const [newAddressState, setNewAddressState] = useState('');
  const [newAddressZipCode, setNewAddressZipCode] = useState('');
  const [addressModalError, setAddressModalError] = useState<string | null>(null);

  useEffect(() => {
    loadEnderecos();
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

  const loadEnderecos = async () => {
    try {
      const lista = await getEnderecos();
      setEnderecos(lista);
      
      // Seleciona endereço padrão se houver
      const padrao = lista.find((e: any) => e.isDefault);
      if (padrao) {
        setEnderecoSelecionado(padrao);
      } else if (lista.length > 0) {
        setEnderecoSelecionado(lista[0]);
      }
    } catch (error) {
      console.log('Erro ao carregar endereços:', error);
    }
  };

  const handleAddAddress = async () => {
    setAddressModalError(null);
    
    if (!newAddressLabel.trim() || !newAddressStreet.trim() || !newAddressNumber.trim() || 
        !newAddressNeighborhood.trim() || !newAddressCity.trim() || !newAddressState.trim() || 
        !newAddressZipCode.trim()) {
      setAddressModalError('Preencha todos os campos obrigatórios!');
      return;
    }

    try {
      // Construir endereço completo
      const enderecoCompleto = `${newAddressStreet}, ${newAddressNumber}${newAddressComplement ? ', ' + newAddressComplement : ''}, ${newAddressNeighborhood}, ${newAddressCity} - ${newAddressState}, ${newAddressZipCode}`;
      
      const novoEndereco = await addEndereco({
        label: newAddressLabel,
        address: enderecoCompleto,
        latitude: 0,
        longitude: 0,
      });

      // Recarregar endereços
      await loadEnderecos();
      
      // Selecionar o novo endereço
      setEnderecoSelecionado(novoEndereco);
      
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
      
      Alert.alert('Sucesso', 'Endereço salvo e selecionado com sucesso!');
      
    } catch (error: any) {
      console.log('Erro ao adicionar endereço:', error);
      setAddressModalError(`Erro ao salvar endereço: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleContinue = () => {
    if (!enderecoSelecionado && opcaoEntrega === 'padrao') {
      Alert.alert('Atenção', 'Selecione um endereço de entrega ou escolha a opção de retirada na loja.');
      return;
    }
    
    // Passar dados para próxima tela
    (navigation as any).navigate('FormaPagamento', {
      endereco: enderecoSelecionado,
      opcaoEntrega: opcaoEntrega,
      taxaEntrega: taxaEntrega
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
        {/* Endereço de entrega */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entregar no endereço</Text>
          
          {enderecos.length > 0 ? (
            <View style={styles.addressCard}>
              <View style={styles.addressInfo}>
                <Text style={styles.addressIcon}>📍</Text>
                <View style={styles.addressDetails}>
                  <Text style={styles.addressText}>{enderecoSelecionado?.address || 'Selecione um endereço'}</Text>
                  <Text style={styles.addressLabel}>
                    {enderecoSelecionado?.label || 'Endereço'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.changeAddressButton}
                onPress={() => (navigation as any).navigate('Enderecos', { 
                  forSelection: true,
                  onAddressSelected: (selectedAddress: any) => {
                    console.log('Callback executado - endereço selecionado:', selectedAddress);
                    setEnderecoSelecionado(selectedAddress);
                  }
                })}
              >
                <Text style={styles.changeAddressText}>Trocar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noAddressCard}>
              <Text style={styles.noAddressIcon}>📍</Text>
              <Text style={styles.noAddressTitle}>Nenhum endereço salvo</Text>
              <TouchableOpacity 
                style={styles.addAddressButton}
                onPress={() => setShowAddressModal(true)}
              >
                <Text style={styles.addAddressButtonText}>Adicionar Endereço</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Opções de entrega */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Opções de entrega</Text>
            {/* <TouchableOpacity>
              <Text style={styles.helpIcon}>?</Text>
            </TouchableOpacity> */}
          </View>
          
          {/* Opção Padrão */}
          <TouchableOpacity 
            style={[
              styles.deliveryOption,
              opcaoEntrega === 'padrao' && styles.deliveryOptionSelected
            ]}
            onPress={() => setOpcaoEntrega('padrao')}
          >
            <View style={styles.deliveryOptionContent}>
              <View style={styles.deliveryOptionInfo}>
                <Text style={styles.deliveryOptionTitle}>Padrão</Text>
                <Text style={styles.deliveryOptionTime}>Hoje, 70 - 80min</Text>
              </View>
              <View style={styles.deliveryOptionRight}>
                <Text style={styles.deliveryOptionPrice}>R$ {taxaEntrega.toFixed(2)}</Text>
                <View style={[
                  styles.deliveryOptionRadio,
                  opcaoEntrega === 'padrao' && styles.deliveryOptionRadioSelected
                ]} />
              </View>
            </View>
          </TouchableOpacity>

          {/* Opção Retirada */}
          {/* <TouchableOpacity 
            style={[
              styles.deliveryOption,
              opcaoEntrega === 'retirada' && styles.deliveryOptionSelected
            ]}
            onPress={() => setOpcaoEntrega('retirada')}
          >
            <View style={styles.deliveryOptionContent}>
              <View style={styles.deliveryOptionInfo}>
                <Text style={styles.deliveryOptionTitleFree}>Taxa grátis retirando seu pedido na loja</Text>
              </View>
              <Text style={styles.deliveryOptionArrow}>›</Text>
            </View>
          </TouchableOpacity> */}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerContent}>
          <View style={styles.footerTotal}>
            <Text style={styles.footerTotalLabel}>Total com a entrega</Text>
            <Text style={styles.footerTotalValue}>
              R$ {opcaoEntrega === 'padrao' ? (taxaEntrega + cartState.items.reduce((total, item) => total + item.preco * item.quantidade, 0)).toFixed(2) : cartState.items.reduce((total, item) => total + item.preco * item.quantidade, 0).toFixed(2)} / {cartState.items.length} item{cartState.items.length > 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal de Adicionar Endereço */}
      <Modal visible={showAddressModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adicionar Endereço</Text>
            <Text style={styles.modalSubtitle}>
              Preencha os dados do seu endereço:
            </Text>
            
            {addressModalError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{addressModalError}</Text>
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
              
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.modalInput, styles.inputHalf]}
                  placeholder="Número"
                  value={newAddressNumber}
                  onChangeText={setNewAddressNumber}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.modalInput, styles.inputHalf]}
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
              
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.modalInput, styles.inputTwoThirds]}
                  placeholder="Cidade"
                  value={newAddressCity}
                  onChangeText={setNewAddressCity}
                />
                <TextInput
                  style={[styles.modalInput, styles.inputThird]}
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
            <View style={styles.modalButtons}>
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
              >
                <Text style={styles.modalButtonTextPrimary}>Salvar Endereço</Text>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  addressCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  addressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  addressDetails: {
    flex: 1,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  addressLabel: {
    fontSize: 14,
    color: '#666',
  },
  changeAddressButton: {
    backgroundColor: 'transparent',
  },
  changeAddressText: {
    fontSize: 16,
    color: '#e5293e',
    fontWeight: '600',
  },
  noAddressCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  noAddressIcon: {
    fontSize: 32,
    marginBottom: 8,
    color: '#e5293e',
  },
  noAddressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  addAddressButton: {
    backgroundColor: '#e5293e',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  addAddressButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deliveryOption: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  deliveryOptionSelected: {
    borderColor: '#e5293e',
    backgroundColor: '#fff5f5',
  },
  deliveryOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveryOptionInfo: {
    flex: 1,
  },
  deliveryOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  deliveryOptionTitleFree: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deliveryOptionTime: {
    fontSize: 14,
    color: '#666',
  },
  deliveryOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deliveryOptionPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deliveryOptionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  deliveryOptionRadioSelected: {
    backgroundColor: '#e5293e',
    borderColor: '#e5293e',
  },
  deliveryOptionArrow: {
    fontSize: 20,
    color: '#666',
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
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  footerTotal: {
    flex: 1,
  },
  footerTotalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  footerTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  continueButton: {
    backgroundColor: '#e5293e',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minWidth: 120,
    alignItems: 'center',
    shadowColor: '#e5293e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonText: {
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
  inputTwoThirds: {
    flex: 2,
  },
  inputThird: {
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
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

export default EnderecoEntregaScreen;

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { getEnderecos, addEndereco } from '../services/enderecoService';
import { useCart } from '../context/CartContext';
import { getEstabelecimentoById } from '../services/estabelecimentoService';
import AddressInput from '../components/AddressInput';
import { AddressSuggestion } from '../services/geolocationService';

const EnderecoEntregaScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { state: cartState } = useCart();
  const [enderecos, setEnderecos] = useState<any[]>([]);
  const [enderecoSelecionado, setEnderecoSelecionado] = useState<any>(null);
  const [opcaoEntrega, setOpcaoEntrega] = useState<'padrao' | 'retirada'>('padrao');
  const [taxaEntrega, setTaxaEntrega] = useState(0);
  const [estabelecimento, setEstabelecimento] = useState<any>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  
  const [newAddressLabel, setNewAddressLabel] = useState('');
  const [newAddressValue, setNewAddressValue] = useState('');
  const [newAddressLatitude, setNewAddressLatitude] = useState<number | null>(null);
  const [newAddressLongitude, setNewAddressLongitude] = useState<number | null>(null);
  const [addressModalError, setAddressModalError] = useState<string | null>(null);

  useEffect(() => {
    loadEnderecos();
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
    if (!estabelecimento || opcaoEntrega === 'retirada') return 0;
    
    const subtotal = cartState.items.reduce((total, item) => total + item.preco * item.quantidade, 0);
    
    // Verificar se frete grátis está ativado e se o subtotal atinge o valor mínimo
    if (estabelecimento.freteGratisAtivado && estabelecimento.valorMinimoFreteGratis && subtotal >= estabelecimento.valorMinimoFreteGratis) {
      return 0;
    }
    
    return estabelecimento.taxaEntrega || 0;
  };

  const loadEnderecos = async () => {
    try {
      const lista = await getEnderecos();
      setEnderecos(lista);
      
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
    
    if (!newAddressLabel.trim() || !newAddressValue.trim()) {
      setAddressModalError('Preencha todos os campos obrigatórios!');
      return;
    }

    if (!newAddressLatitude || !newAddressLongitude) {
      setAddressModalError('Selecione um endereço válido usando a busca!');
      return;
    }

    try {
      const novoEndereco = await addEndereco({
        label: newAddressLabel,
        address: newAddressValue,
        latitude: newAddressLatitude,
        longitude: newAddressLongitude,
      });

      await loadEnderecos();
      setEnderecoSelecionado(novoEndereco);
      setShowAddressModal(false);
      setNewAddressLabel('');
      setNewAddressValue('');
      setNewAddressLatitude(null);
      setNewAddressLongitude(null);
      
      Alert.alert('Sucesso', 'Endereço salvo e selecionado com sucesso!');
      
    } catch (error: any) {
      console.log('Erro ao adicionar endereço:', error);
      setAddressModalError(`Erro ao salvar endereço: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleAddressSelect = (suggestion: AddressSuggestion) => {
    setNewAddressValue(suggestion.displayName);
    setNewAddressLatitude(suggestion.latitude);
    setNewAddressLongitude(suggestion.longitude);
  };

  const handleContinue = () => {
    if (!enderecoSelecionado && opcaoEntrega === 'padrao') {
      Alert.alert('Atenção', 'Selecione um endereço de entrega ou escolha a opção de retirada na loja.');
      return;
    }
    
    (navigation as any).navigate('FormaPagamento', {
      endereco: enderecoSelecionado,
      opcaoEntrega: opcaoEntrega,
      taxaEntrega: calculateTaxaEntrega()
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
        {/* Endereço de entrega */}
        <View className="px-4 py-4 bg-white border-b border-gray-200">
          <Text className="text-lg font-bold text-gray-800 mb-3">Entregar no endereço</Text>
          
          {enderecos.length > 0 ? (
            <View className="flex-row justify-between items-center bg-gray-50 rounded-xl p-4 border border-gray-200">
              <View className="flex-row items-center flex-1">
                <Ionicons name="location" size={16} color="#ea1d2c" />
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold text-gray-800 mb-1">
                    {enderecoSelecionado?.address || 'Selecione um endereço'}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    {enderecoSelecionado?.label || 'Endereço'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                onPress={() => (navigation as any).navigate('Enderecos', { 
                  forSelection: true,
                  onAddressSelected: (selectedAddress: any) => {
                    console.log('Callback executado - endereço selecionado:', selectedAddress);
                    setEnderecoSelecionado(selectedAddress);
                  }
                })}
              >
                <Text className="text-base text-red-600 font-semibold ml-2">Trocar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="bg-gray-50 rounded-xl p-5 items-center border border-gray-200">
              <Ionicons name="location-outline" size={32} color="#ea1d2c" />
              <Text className="text-base font-bold text-gray-800 mb-3 mt-2 text-center">
                Nenhum endereço salvo
              </Text>
              <TouchableOpacity 
                className="bg-red-600 rounded-lg py-3 px-5 items-center"
                onPress={() => setShowAddressModal(true)}
              >
                <Text className="text-white text-sm font-bold">Adicionar Endereço</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Opções de entrega */}
        <View className="px-4 py-4 bg-white border-b border-gray-200">
          <Text className="text-lg font-bold text-gray-800 mb-3">Opções de entrega</Text>
          
          <TouchableOpacity 
            className={`bg-white rounded-xl p-4 mb-2 border ${
              opcaoEntrega === 'padrao' ? 'border-red-600 bg-red-50' : 'border-gray-200'
            }`}
            onPress={() => setOpcaoEntrega('padrao')}
            activeOpacity={0.8}
          >
            <View className="flex-row justify-between items-center">
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-800 mb-1">Padrão</Text>
                <Text className="text-sm text-gray-600">Hoje, 70 - 80min</Text>
              </View>
              <View className="flex-row items-center gap-3">
                {estabelecimento?.freteGratisAtivado && estabelecimento?.valorMinimoFreteGratis && cartState.items.reduce((total, item) => total + item.preco * item.quantidade, 0) >= estabelecimento.valorMinimoFreteGratis ? (
                  <Text className="text-base font-semibold text-green-600">Grátis</Text>
                ) : (
                  <Text className="text-base font-semibold text-gray-800">R$ {calculateTaxaEntrega().toFixed(2)}</Text>
                )}
                <View className={`w-5 h-5 rounded-full border-2 ${
                  opcaoEntrega === 'padrao' ? 'bg-red-600 border-red-600' : 'border-gray-300'
                }`} />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-8">
        <View className="flex-row items-center px-4 py-4">
          <View className="flex-1">
            <Text className="text-sm text-gray-600 mb-1">Total com a entrega</Text>
            <Text className="text-lg font-bold text-gray-800">
              R$ {opcaoEntrega === 'padrao' ? (calculateTaxaEntrega() + cartState.items.reduce((total, item) => total + item.preco * item.quantidade, 0)).toFixed(2) : cartState.items.reduce((total, item) => total + item.preco * item.quantidade, 0).toFixed(2)} / {cartState.items.length} item{cartState.items.length > 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            className="bg-red-600 rounded-xl py-4 px-6 min-w-[120px] items-center"
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text className="text-white text-base font-bold">Continuar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal de Adicionar Endereço */}
      <Modal visible={showAddressModal} transparent animationType="slide">
        <View className="flex-1 bg-black/40 justify-center items-center">
          <View className="bg-white rounded-2xl p-6 w-[90%] max-h-[80%]">
            <Text className="font-bold text-lg mb-2 text-red-600">Adicionar Endereço</Text>
            <Text className="text-sm text-gray-600 mb-5">
              Preencha os dados do seu endereço:
            </Text>
            
            {addressModalError && (
              <View className="bg-red-50 border border-red-200 rounded-lg py-2 px-3 mb-3">
                <Text className="text-red-600 text-sm font-medium">{addressModalError}</Text>
              </View>
            )}
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                className="border border-gray-200 rounded-lg py-3 px-4 text-base bg-gray-50 mb-3 text-gray-800"
                placeholder="Nome do endereço (ex: Casa, Trabalho)"
                placeholderTextColor="#aaa"
                value={newAddressLabel}
                onChangeText={setNewAddressLabel}
              />
              
              <AddressInput
                label="Endereço"
                placeholder="Digite o endereço completo"
                value={newAddressValue}
                onChangeText={setNewAddressValue}
                onAddressSelect={handleAddressSelect}
                required
                showLocationButton={true}
                style={{ marginBottom: 16 }}
              />
            </ScrollView>
            
            {/* Botões */}
            <View className="flex-row justify-between mt-5 gap-3">
              <TouchableOpacity
                className="flex-1 bg-gray-50 border border-gray-200 py-3 rounded-lg items-center"
                onPress={() => {
                  setShowAddressModal(false);
                  setAddressModalError(null);
                  setNewAddressLabel('');
                  setNewAddressValue('');
                  setNewAddressLatitude(null);
                  setNewAddressLongitude(null);
                }}
                activeOpacity={0.8}
              >
                <Text className="text-gray-600 text-base font-medium">Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="flex-1 bg-red-600 py-3 rounded-lg items-center"
                onPress={handleAddAddress}
                activeOpacity={0.8}
              >
                <Text className="text-white text-base font-bold">Salvar Endereço</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default EnderecoEntregaScreen;

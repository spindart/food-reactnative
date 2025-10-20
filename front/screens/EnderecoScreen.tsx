import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, SafeAreaView, ScrollView, Alert } from 'react-native';
import { getEnderecos, addEndereco, deleteEndereco, updateEndereco, setEnderecoPadrao } from '../services/enderecoService';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import AddressInput from '../components/AddressInput';
import { AddressSuggestion } from '../services/geolocationService';

const EnderecoScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { forSelection = false } = route.params || {};
  
  const [enderecos, setEnderecos] = useState<any[]>([]);
  const [enderecoPadrao, setEnderecoPadrao] = useState<number | null>(null);
  const [novoEndereco, setNovoEndereco] = useState('');
  const [label, setLabel] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' });
  const [loadingDefault, setLoadingDefault] = useState<number | null>(null);

  const loadEnderecos = useCallback(async () => {
    try {
      console.log('Carregando endereços...');
      const lista = await getEnderecos();
      console.log('Lista carregada:', lista);
      
      // Correção automática: se nenhum endereço é padrão, definir o primeiro como padrão
      const temPadrao = lista.some((e: any) => e.isDefault);
      if (!temPadrao && lista.length > 0) {
        console.log('Nenhum endereço padrão encontrado. Definindo o primeiro como padrão automaticamente...');
        try {
          await setEnderecoPadrao(lista[0].id);
          // Recarregar lista após correção
          const listaCorrigida = await getEnderecos();
          setEnderecos(listaCorrigida);
          setEnderecoPadrao(listaCorrigida[0].id);
          console.log('Endereço padrão corrigido automaticamente');
        } catch (error) {
          console.error('Erro ao corrigir endereço padrão automaticamente:', error);
          setEnderecos(lista);
          setEnderecoPadrao(null);
        }
      } else {
        setEnderecos(lista);
        // Atualiza o endereço padrão ao entrar na tela
        const padrao = lista.find((e: any) => e.isDefault);
        console.log('Endereço padrão atual:', padrao);
        setEnderecoPadrao(padrao ? padrao.id : null);
      }
    } catch (e: any) {
      console.error('Erro ao carregar endereços:', e);
      setSnackbar({ visible: true, message: `Erro ao carregar endereços: ${e.message || 'Erro desconhecido'}`, type: 'error' });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEnderecos();
    }, [loadEnderecos])
  );

  useEffect(() => {
    loadEnderecos();
  }, [loadEnderecos]);

  const handleAddressSelect = (address: AddressSuggestion) => {
    setLat(address.latitude);
    setLng(address.longitude);
  };

  const handleSelectAddress = (endereco: any) => {
    if (forSelection) {
      // Se veio do checkout, retornar o endereço selecionado via callback
      console.log('Endereço selecionado:', endereco);
      if (route.params?.onAddressSelected) {
        route.params.onAddressSelected(endereco);
        console.log('Callback executado com sucesso');
      } else {
        console.log('Callback não encontrado nos params');
      }
      (navigation as any).goBack();
    }
  };

  const handleSalvar = async () => {
    if (!novoEndereco.trim() || !label.trim()) {
      setSnackbar({ visible: true, message: 'Preencha todos os campos obrigatórios!', type: 'error' });
      return;
    }

    try {
      const token = await import('@react-native-async-storage/async-storage').then(AsyncStorage => AsyncStorage.default.getItem('jwtToken'));
      console.log('JWT Token:', token);
      
      if (editId) {
        const atualizado = await updateEndereco(editId, { label, address: novoEndereco, latitude: lat, longitude: lng });
        setEnderecos(enderecos.map(e => e.id === editId ? atualizado : e));
        setEditId(null);
        setSnackbar({ visible: true, message: 'Endereço atualizado com sucesso!', type: 'success' });
      } else {
        const novo = await addEndereco({ label, address: novoEndereco, latitude: lat, longitude: lng });
        setEnderecos([...enderecos, novo]);
        setSnackbar({ visible: true, message: 'Endereço salvo com sucesso!', type: 'success' });
      }
      
      // Limpar campos
      setNovoEndereco('');
      setLabel('');
      setLat(null);
      setLng(null);
      
      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSnackbar({ visible: false, message: '', type: 'success' }), 3000);
      
    } catch (e: any) {
      console.log('Erro ao salvar endereço:', e);
      setSnackbar({ visible: true, message: `Erro ao salvar endereço: ${e.message || 'Erro desconhecido'}`, type: 'error' });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>
            {forSelection ? 'Selecionar Endereço' : 'Meus Endereços'}
          </Text>
          
          {forSelection && (
            <View style={styles.selectionInfo}>
              <Text style={styles.selectionInfoText}>
                📍 Selecione o endereço para entrega
              </Text>
            </View>
          )}
          
          {enderecos.length > 0 ? (
            <View style={styles.enderecosList}>
              {enderecos.map((item) => (
                <View key={item.id} style={styles.item}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.label}>{item.label}</Text>
                    {item.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>PADRÃO</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.address}>{item.address}</Text>
                  <View style={styles.itemActions}>
                    {forSelection ? (
                      // Modo seleção - apenas botão de selecionar
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.selectButton]}
                        onPress={() => handleSelectAddress(item)}
                      >
                        <Text style={styles.selectButtonText}>Selecionar</Text>
                      </TouchableOpacity>
                    ) : (
                      // Modo normal - todos os botões
                      <>
                        <TouchableOpacity 
                          style={[
                            styles.actionButton, 
                            item.isDefault && styles.actionButtonDisabled,
                            loadingDefault === item.id && styles.actionButtonLoading
                          ]}
                          onPress={async () => {
                            try {
                              console.log('Definindo endereço padrão:', item.id);
                              setLoadingDefault(item.id);
                              
                              // Chamar API primeiro - se não lançar exceção, foi bem-sucedido
                              await setEnderecoPadrao(item.id);
                              console.log('Endereço padrão definido com sucesso');
                              
                              // Atualizar estado local imediatamente para melhor UX
                              setEnderecos(prevEnderecos => 
                                prevEnderecos.map(e => ({
                                  ...e,
                                  isDefault: e.id === item.id
                                }))
                              );
                              setEnderecoPadrao(item.id);
                              
                              setSnackbar({ visible: true, message: 'Endereço definido como padrão!', type: 'success' });
                              
                              // Limpar mensagem de sucesso após 3 segundos
                              setTimeout(() => setSnackbar({ visible: false, message: '', type: 'success' }), 3000);
                              
                            } catch (e: any) {
                              console.error('Erro ao definir endereço padrão:', e);
                              setSnackbar({ visible: true, message: `Erro ao definir endereço padrão: ${e.message || 'Erro desconhecido'}`, type: 'error' });
                              
                              // Recarregar lista em caso de erro para manter sincronização
                              setTimeout(async () => {
                                try {
                                  await loadEnderecos();
                                } catch (error) {
                                  console.error('Erro ao recarregar endereços após falha:', error);
                                }
                              }, 1000);
                            } finally {
                              setLoadingDefault(null);
                            }
                          }}
                          disabled={item.isDefault || loadingDefault === item.id}
                        >
                          <Text style={[styles.actionButtonText, item.isDefault && styles.actionButtonTextDisabled]}>
                            {loadingDefault === item.id ? 'Definindo...' : (item.isDefault ? 'Padrão' : 'Definir como padrão')}
                          </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={styles.actionButton}
                          onPress={() => {
                            setEditId(item.id);
                            setNovoEndereco(item.address);
                            setLabel(item.label);
                            setLat(item.latitude);
                            setLng(item.longitude);
                          }}
                        >
                          <Text style={styles.actionButtonText}>Editar</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={[styles.actionButton, styles.deleteButton]}
                          onPress={async () => {
                            Alert.alert(
                              'Confirmar Exclusão',
                              'Tem certeza que deseja excluir este endereço?',
                              [
                                { text: 'Cancelar', style: 'cancel' },
                                { 
                                  text: 'Excluir', 
                                  style: 'destructive',
                                  onPress: async () => {
                                    try {
                                      await deleteEndereco(item.id);
                                      setEnderecos(enderecos.filter(e => e.id !== item.id));
                                      setSnackbar({ visible: true, message: 'Endereço excluído com sucesso!', type: 'success' });
                                    } catch (e: any) {
                                      setSnackbar({ visible: true, message: `Erro ao excluir endereço: ${e.message || 'Erro desconhecido'}`, type: 'error' });
                                    }
                                  }
                                }
                              ]
                            );
                          }}
                        >
                          <Text style={styles.deleteButtonText}>Excluir</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📍</Text>
              <Text style={styles.empty}>Nenhum endereço salvo</Text>
              <Text style={styles.emptySubtext}>Adicione seu primeiro endereço abaixo</Text>
            </View>
          )}

          <View style={styles.addSection}>
            <Text style={styles.subtitle}>
              {editId ? 'Editar Endereço' : 'Adicionar Novo Endereço'}
            </Text>
            
            {/* Botões de teste temporários */}
        
            
            <AddressInput
              label="Endereço"
              placeholder="Digite o endereço completo"
              value={novoEndereco}
              onChangeText={setNovoEndereco}
              onAddressSelect={handleAddressSelect}
              required
            />
            
            <TextInput
              style={styles.input}
              placeholder="Nome (ex: Casa, Trabalho)"
              value={label}
              onChangeText={setLabel}
            />
            
            <TouchableOpacity 
              style={[styles.button, (!novoEndereco.trim() || !label.trim()) && styles.buttonDisabled]} 
              onPress={handleSalvar}
              disabled={!novoEndereco.trim() || !label.trim()}
            >
              <Text style={styles.buttonText}>
                {editId ? 'Atualizar Endereço' : 'Salvar Endereço'}
              </Text>
            </TouchableOpacity>
            
            {editId && (
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setEditId(null);
                  setNovoEndereco('');
                  setLabel('');
                  setLat(null);
                  setLng(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar Edição</Text>
              </TouchableOpacity>
            )}
          </View>
          

        </View>
      </ScrollView>
      
      {/* Snackbar de feedback */}
      {snackbar.visible && (
        <View style={[
          styles.snackbar, 
          snackbar.type === 'success' ? styles.snackbarSuccess : styles.snackbarError
        ]}>
          <Text style={styles.snackbarText}>{snackbar.message}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa' 
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 24,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  selectionInfo: {
    backgroundColor: '#e8f5e8',
    borderWidth: 1,
    borderColor: '#c3e6c3',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  selectionInfoText: {
    color: '#2d5a2d',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  enderecosList: {
    marginBottom: 32,
  },
  item: { 
    marginBottom: 16, 
    padding: 20, 
    backgroundColor: '#fff', 
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: { 
    fontWeight: 'bold', 
    fontSize: 18,
    color: '#1a1a1a',
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: '#e5293e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  address: { 
    color: '#666', 
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: '#e9ecef',
    borderColor: '#dee2e6',
  },
  actionButtonLoading: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e5293e',
    opacity: 0.7,
  },
  actionButtonText: {
    color: '#495057',
    fontWeight: '600',
    fontSize: 14,
  },
  actionButtonTextDisabled: {
    color: '#6c757d',
  },
  deleteButton: {
    backgroundColor: '#fff5f5',
    borderColor: '#fecaca',
  },
  deleteButtonText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 14,
  },
  selectButton: {
    backgroundColor: '#e5293e',
    borderColor: '#e5293e',
  },
  selectButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    marginBottom: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  empty: { 
    color: '#6c757d', 
    textAlign: 'center', 
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#adb5bd',
    textAlign: 'center',
    fontSize: 14,
  },
  addSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  subtitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 20,
    color: '#1a1a1a',
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#e9ecef', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: { 
    backgroundColor: '#e5293e', 
    borderRadius: 12, 
    padding: 16, 
    alignItems: 'center', 
    marginTop: 8,
    shadowColor: '#e5293e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#adb5bd',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6c757d',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    color: '#6c757d',
    fontWeight: '600',
    fontSize: 16,
  },
  defaultInfo: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  defaultInfoText: {
    color: '#16a34a',
    fontWeight: '600',
    fontSize: 15,
  },
  snackbar: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  snackbarSuccess: {
    backgroundColor: '#16a34a',
  },
  snackbarError: {
    backgroundColor: '#dc2626',
  },
  snackbarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default EnderecoScreen;

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, SafeAreaView, ScrollView, Alert } from 'react-native';
import { getEnderecos, addEndereco, deleteEndereco, updateEndereco, setEnderecoPadrao } from '../services/enderecoService';
import { useFocusEffect } from '@react-navigation/native';
// Para autocomplete, instale e use: react-native-google-places-autocomplete
// import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

const EnderecoScreen: React.FC = () => {
  const [enderecos, setEnderecos] = useState<any[]>([]);
  const [enderecoPadrao, setEnderecoPadrao] = useState<number | null>(null);
  const [novoEndereco, setNovoEndereco] = useState('');
  const [label, setLabel] = useState('');
  const [sugestoes, setSugestoes] = useState<any[]>([]);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' });

  const loadEnderecos = useCallback(async () => {
    try {
      const lista = await getEnderecos();
      setEnderecos(lista);
      // Atualiza o endereço padrão ao entrar na tela
      const padrao = lista.find((e: any) => e.isDefault);
      setEnderecoPadrao(padrao ? padrao.id : null);
    } catch (e) {
      console.log('Erro ao carregar endereços:', e);
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
          <Text style={styles.title}>Meus Endereços</Text>
          
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
                    <TouchableOpacity 
                      style={[styles.actionButton, item.isDefault && styles.actionButtonDisabled]}
                      onPress={async () => {
                        try {
                          await setEnderecoPadrao(item.id);
                          // Atualiza lista e endereço padrão
                          const lista = await getEnderecos();
                          setEnderecos(lista);
                          const padrao = lista.find((e: any) => e.isDefault);
                          setEnderecoPadrao(padrao ? padrao.id : null);
                          setSnackbar({ visible: true, message: 'Endereço definido como padrão!', type: 'success' });
                        } catch (e: any) {
                          setSnackbar({ visible: true, message: `Erro ao definir endereço padrão: ${e.message || 'Erro desconhecido'}`, type: 'error' });
                        }
                      }}
                      disabled={item.isDefault}
                    >
                      <Text style={[styles.actionButtonText, item.isDefault && styles.actionButtonTextDisabled]}>
                        {item.isDefault ? 'Padrão' : 'Definir como padrão'}
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
            
            {/* Autocomplete Nominatim (OpenStreetMap) */}
            <TextInput
              style={styles.input}
              placeholder="Pesquisar endereço"
              value={novoEndereco}
              onChangeText={async (text) => {
                setNovoEndereco(text);
                if (text.length > 3) {
                  try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=br&q=${encodeURIComponent(text)}`);
                    const data = await res.json();
                    setSugestoes(data);
                  } catch (e) {
                    setSugestoes([]);
                  }
                } else {
                  setSugestoes([]);
                }
              }}
            />
            
            {sugestoes.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {sugestoes.slice(0, 5).map((item: any) => (
                  <TouchableOpacity 
                    key={item.place_id} 
                    style={styles.suggestionItem}
                    onPress={() => {
                      setNovoEndereco(item.display_name);
                      setLat(Number(item.lat));
                      setLng(Number(item.lon));
                      setSugestoes([]);
                    }}
                  >
                    <Text style={styles.suggestionText}>{item.display_name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
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
          
          {enderecoPadrao && (
            <View style={styles.defaultInfo}>
              <Text style={styles.defaultInfoText}>
                ✅ Endereço padrão selecionado para o checkout!
              </Text>
            </View>
          )}
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
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  suggestionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  suggestionText: {
    fontSize: 15,
    color: '#495057',
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

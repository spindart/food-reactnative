import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { updateEstabelecimento, Estabelecimento } from '../services/estabelecimentoService';
import { Snackbar } from 'react-native-paper';
import AddressInput from '../components/AddressInput';
import { AddressSuggestion } from '../services/geolocationService';

const EditarEnderecoEstabelecimentoScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { estabelecimento } = route.params;
  
  const [endereco, setEndereco] = useState(estabelecimento.endereco || '');
  const [latitude, setLatitude] = useState<number | null>(estabelecimento.latitude);
  const [longitude, setLongitude] = useState<number | null>(estabelecimento.longitude);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  const handleAddressSelect = (address: AddressSuggestion) => {
    setLatitude(address.latitude);
    setLongitude(address.longitude);
  };

  const handleSubmit = async () => {
    if (!endereco.trim()) {
      setSnackbar({ visible: true, message: 'Digite o endereço do estabelecimento.', type: 'error' });
      return;
    }

    if (!latitude || !longitude) {
      setSnackbar({ visible: true, message: 'Selecione um endereço válido da lista de sugestões.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      await updateEstabelecimento(estabelecimento.id, {
        endereco,
        latitude,
        longitude,
      });
      setSnackbar({ visible: true, message: 'Endereço atualizado com sucesso!', type: 'success' });
      setTimeout(() => {
        setSnackbar((prev) => ({ ...prev, visible: false }));
        navigation.goBack();
      }, 1500);
    } catch (error) {
      console.error('Erro ao atualizar endereço:', error);
      setSnackbar({ visible: true, message: 'Erro ao atualizar endereço.', type: 'error' });
      setTimeout(() => setSnackbar((prev) => ({ ...prev, visible: false })), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationPress = () => {
    Alert.alert(
      'Localização Atual',
      'Esta funcionalidade permitirá definir o endereço do estabelecimento usando sua localização atual. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Permitir',
          onPress: () => {
            // Implementar obtenção da localização atual
            Alert.alert('Info', 'Funcionalidade de localização atual será implementada com expo-location');
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Editar Endereço</Text>
      <Text style={styles.subtitle}>{estabelecimento.nome}</Text>
      
      <View style={styles.formContainer}>
        <AddressInput
          label="Endereço do Estabelecimento"
          placeholder="Digite o endereço completo do estabelecimento"
          value={endereco}
          onChangeText={setEndereco}
          onAddressSelect={handleAddressSelect}
          onLocationPress={handleLocationPress}
          required
        />

        {latitude && longitude && (
          <View style={styles.coordinatesInfo}>
            <Text style={styles.coordinatesLabel}>Coordenadas:</Text>
            <Text style={styles.coordinatesText}>
              Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}
            </Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.saveButton]} 
            onPress={handleSubmit} 
            disabled={loading || !endereco.trim() || !latitude || !longitude}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Salvar Endereço</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.cancelButton]} 
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar((prev) => ({ ...prev, visible: false }))}
        duration={1500}
      >
        {snackbar.message}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  coordinatesInfo: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  coordinatesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16a34a',
    marginBottom: 4,
  },
  coordinatesText: {
    fontSize: 13,
    color: '#15803d',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  saveButton: {
    backgroundColor: '#e5293e',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6c757d',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButtonText: {
    color: '#6c757d',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default EditarEnderecoEstabelecimentoScreen;

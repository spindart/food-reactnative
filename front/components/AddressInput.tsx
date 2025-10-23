import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import geolocationService, { AddressSuggestion } from '../services/geolocationService';

interface AddressInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onAddressSelect?: (address: AddressSuggestion) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  showLocationButton?: boolean;
  onLocationPress?: () => void;
  style?: any;
  inputStyle?: any;
}

const AddressInput: React.FC<AddressInputProps> = ({
  value,
  onChangeText,
  onAddressSelect,
  placeholder = "Digite o endereço",
  label,
  required = false,
  disabled = false,
  showLocationButton = true,
  onLocationPress,
  style,
  inputStyle,
}) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Debounce da busca para evitar muitas requisições
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (value && value.length >= 3) {
      const timeout = setTimeout(async () => {
        await searchAddresses(value);
      }, 500); // 500ms de delay

      setSearchTimeout(timeout);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [value]);

  const searchAddresses = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    try {
      const results = await geolocationService.searchAddress(query);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (error) {
      console.error('Erro ao buscar endereços:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSelect = (suggestion: AddressSuggestion) => {
    onChangeText(suggestion.displayName);
    setShowSuggestions(false);
    setSuggestions([]);
    
    if (onAddressSelect) {
      onAddressSelect(suggestion);
    }
  };

  const handleLocationPress = () => {
    if (onLocationPress) {
      onLocationPress();
    } else {
      // Implementação padrão para obter localização atual
      getCurrentLocation();
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      
      // Solicitar permissão de localização
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permissão Negada',
          'Permissão de localização é necessária para usar esta funcionalidade.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Obter localização atual
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // Converter coordenadas em endereço
      const address = await geolocationService.reverseGeocode(latitude, longitude);
      
      if (address) {
        onChangeText(address.displayName);
        if (onAddressSelect) {
          onAddressSelect(address);
        }
        Alert.alert(
          'Localização Encontrada',
          `Endereço detectado: ${address.displayName}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Erro',
          'Não foi possível obter o endereço da sua localização atual.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Erro ao obter localização:', error);
      Alert.alert(
        'Erro',
        'Não foi possível obter sua localização atual. Verifique se o GPS está ativado.',
        [{ text: 'OK' }]
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const renderSuggestion = ({ item }: { item: AddressSuggestion }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleAddressSelect(item)}
    >
      <View style={styles.suggestionContent}>
        <Ionicons name="location-outline" size={20} color="#666" />
        <Text style={styles.suggestionText} numberOfLines={2}>
          {item.displayName}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            disabled && styles.inputDisabled,
            inputStyle,
          ]}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          autoComplete="street-address"
          textContentType="fullStreetAddress"
        />
        
        {showLocationButton && (
          <TouchableOpacity
            style={styles.locationButton}
            onPress={handleLocationPress}
            disabled={disabled || locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="#e5293e" />
            ) : (
              <Ionicons name="locate" size={20} color="#e5293e" />
            )}
          </TouchableOpacity>
        )}
        
        {loading && !locationLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#e5293e" />
          </View>
        )}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item) => item.id}
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  required: {
    color: '#e5293e',
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#1a1a1a',
  },
  inputDisabled: {
    backgroundColor: '#f8f9fa',
    color: '#6c757d',
  },
  locationButton: {
    position: 'absolute',
    right: 12,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    position: 'absolute',
    right: 50,
    padding: 8,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e9ecef',
    zIndex: 1000,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: '#495057',
    marginLeft: 12,
    lineHeight: 20,
  },
});

export default AddressInput;
import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAllEstabelecimentos } from '../services/estabelecimentoService';
import { RootStackParamList } from '../types';

type Estabelecimento = {
  id: string;
  nome: string;
  descricao: string;
  endereco: string;
};

const EstabelecimentoListScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEstabelecimentos = async () => {
      try {
        const data = await getAllEstabelecimentos();
        setEstabelecimentos(data);
      } catch (err) {
        setError('Erro ao carregar os estabelecimentos.');
      } finally {
        setLoading(false);
      }
    };

    fetchEstabelecimentos();
  }, []);

  const handleViewProducts = (estabelecimentoId: string) => {
    navigation.navigate('Home', { estabelecimentoId });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={estabelecimentos}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.nome}</Text>
          <Text style={styles.description}>{item.descricao}</Text>
          <Text style={styles.address}>{item.endereco}</Text>
          <TouchableOpacity style={styles.button} onPress={() => handleViewProducts(item.id)}>
            <Text style={styles.buttonText}>Ver Produtos</Text>
          </TouchableOpacity>
        </View>
      )}
      contentContainerStyle={styles.list}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 0,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f1f1',
  },
  name: {
    fontSize: 19,
    fontWeight: 'bold',
    marginTop: 14,
    marginLeft: 16,
    marginBottom: 2,
    color: '#222',
  },
  description: {
    fontSize: 15,
    color: '#666',
    marginLeft: 16,
    marginBottom: 2,
  },
  address: {
    fontSize: 14,
    color: '#888',
    marginLeft: 16,
    marginBottom: 14,
  },
  button: {
    backgroundColor: '#e5293e',
    paddingVertical: 12,
    borderRadius: 0,
    alignItems: 'center',
    width: '100%',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});

export default EstabelecimentoListScreen;

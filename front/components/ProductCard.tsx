import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type ProductCardProps = {
  nome: string;
  preco: number;
  imagem: string;
  onAddToCart: () => void;
};

const ProductCard: React.FC<ProductCardProps> = ({ nome, preco, imagem, onAddToCart }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleViewDetails = () => {
    navigation.navigate('ProductDetail', { nome, preco, imagem });
  };

  return (
    <View style={styles.card}>
      <Image source={{ uri: imagem }} style={styles.image} />
      <Text style={styles.name}>{nome}</Text>
      <Text style={styles.price}>R$ {preco.toFixed(2)}</Text>
      <TouchableOpacity style={styles.button} onPress={onAddToCart}>
        <Text style={styles.buttonText}>Adicionar ao carrinho</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.detailsButton} onPress={handleViewDetails}>
        <Text style={styles.detailsButtonText}>Ver Detalhes</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 0,
    margin: 8,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    width: 180,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f1f1',
  },
  image: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    marginBottom: 0,
    resizeMode: 'cover',
    backgroundColor: '#f6f6f6',
  },
  name: {
    fontSize: 17,
    fontWeight: 'bold',
    marginTop: 10,
    marginLeft: 12,
    marginBottom: 2,
    color: '#222',
  },
  price: {
    fontSize: 16,
    color: '#e5293e',
    marginLeft: 12,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#e5293e',
    paddingVertical: 8,
    paddingHorizontal: 0,
    borderRadius: 0,
    width: '100%',
    alignItems: 'center',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  detailsButton: {
    marginTop: 0,
    backgroundColor: '#fff',
    paddingVertical: 8,
    width: '100%',
    alignItems: 'center',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopWidth: 1,
    borderColor: '#f1f1f1',
  },
  detailsButtonText: {
    color: '#e5293e',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default ProductCard;

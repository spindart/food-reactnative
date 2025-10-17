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
      <TouchableOpacity onPress={handleViewDetails} activeOpacity={0.8}>
        <Image source={{ uri: imagem }} style={styles.image} />
        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={2}>{nome}</Text>
          <Text style={styles.price}>R$ {preco.toFixed(2)}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.addButton} onPress={onAddToCart} activeOpacity={0.8}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    position: 'relative',
    width: 180,
  },
  image: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
    backgroundColor: '#f6f6f6',
  },
  content: {
    padding: 12,
    paddingBottom: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e5293e',
  },
  addButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e5293e',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#e5293e',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default ProductCard;

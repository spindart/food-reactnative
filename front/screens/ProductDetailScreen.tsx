import React from 'react';
import { useCart } from '../context/CartContext';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';

type ProductDetailParams = {
  ProductDetail: {
    nome: string;
    descricao: string;
    preco: number;
    imagem: string;
  };
};

type ProductDetailRouteProp = RouteProp<ProductDetailParams, 'ProductDetail'>;

const ProductDetailScreen: React.FC = () => {
  const route = useRoute<ProductDetailRouteProp>();
  const { nome, descricao, preco, imagem } = route.params;

  const { dispatch } = useCart();
  const handleAddToCart = () => {
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        id: nome,
        nome,
        preco,
        quantidade: 1,
      },
    });
  };

  return (
    <View style={styles.container}>
      <Image source={{ uri: imagem }} style={styles.image} />
      <Text style={styles.name}>{nome}</Text>
      <Text style={styles.description}>{descricao}</Text>
      <Text style={styles.price}>R$ {preco.toFixed(2)}</Text>
      <TouchableOpacity style={styles.button} onPress={handleAddToCart}>
        <Text style={styles.buttonText}>Adicionar ao carrinho</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  image: {
    width: '100%',
    height: 240,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: 0,
    resizeMode: 'cover',
    backgroundColor: '#f6f6f6',
  },
  name: {
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 8,
    color: '#222',
    textAlign: 'center',
  },
  description: {
    fontSize: 17,
    color: '#666',
    marginBottom: 18,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  price: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#e5293e',
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#e5293e',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#e5293e',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});

export default ProductDetailScreen;

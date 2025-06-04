import React from 'react';
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

  const handleAddToCart = () => {
    console.log(`${nome} adicionado ao carrinho.`);
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
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007BFF',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProductDetailScreen;

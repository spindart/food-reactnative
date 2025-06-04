import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ProductListScreen from './screens/ProductListScreen';
import ProductDetailScreen from './screens/ProductDetailScreen';
import DonoDashboardScreen from './screens/DonoDashboardScreen';
import CadastrarEstabelecimentoScreen from './screens/CadastrarEstabelecimentoScreen';
import EditarEstabelecimentoScreen from './screens/EditarEstabelecimentoScreen';
import CadastrarProdutoScreen from './screens/CadastrarProdutoScreen';
import ProdutosDoEstabelecimentoScreen from './screens/ProdutosDoEstabelecimentoScreen';
import EditarProdutoScreen from './screens/EditarProdutoScreen';
import PedidosDoEstabelecimentoScreen from './screens/PedidosDoEstabelecimentoScreen';
import * as Notifications from 'expo-notifications';

const Stack = createNativeStackNavigator();

const registerForPushNotifications = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    alert('Permissão para notificações foi negada.');
    return;
  }
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log('Token de notificação:', token);
  // Enviar o token para o backend
};

export default function App() {
  useEffect(() => {
    registerForPushNotifications();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={ProductListScreen} options={{ title: 'Produtos' }} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Detalhes do Produto' }} />
        <Stack.Screen name="DonoDashboard" component={DonoDashboardScreen} options={{ title: 'Painel do Dono' }} />
        <Stack.Screen name="CadastrarEstabelecimento" component={CadastrarEstabelecimentoScreen} options={{ title: 'Cadastrar Estabelecimento' }} />
        <Stack.Screen name="EditarEstabelecimento" component={EditarEstabelecimentoScreen} options={{ title: 'Editar Estabelecimento' }} />
        <Stack.Screen name="CadastrarProduto" component={CadastrarProdutoScreen} options={{ title: 'Cadastrar Produto' }} />
        <Stack.Screen name="ProdutosDoEstabelecimento" component={ProdutosDoEstabelecimentoScreen} options={{ title: 'Produtos do Estabelecimento' }} />
        <Stack.Screen name="EditarProduto" component={EditarProdutoScreen} options={{ title: 'Editar Produto' }} />
        <Stack.Screen name="PedidosDoEstabelecimento" component={PedidosDoEstabelecimentoScreen} options={{ title: 'Pedidos do Estabelecimento' }} />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ProductDetailScreen from './screens/ProductDetailScreen';
import DonoDashboardScreen from './screens/DonoDashboardScreen';
import CadastrarEstabelecimentoScreen from './screens/CadastrarEstabelecimentoScreen';
import EditarEstabelecimentoScreen from './screens/EditarEstabelecimentoScreen';
import CadastrarProdutoScreen from './screens/CadastrarProdutoScreen';
import ProdutosDoEstabelecimentoScreen from './screens/ProdutosDoEstabelecimentoScreen';
import EditarProdutoScreen from './screens/EditarProdutoScreen';
import PedidosDoEstabelecimentoScreen from './screens/PedidosDoEstabelecimentoScreen';
import * as Notifications from 'expo-notifications';
import { CartProvider, useCart } from './context/CartContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

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

function MainTabs() {
  const { state } = useCart();
  return (
    <Tab.Navigator
      screenOptions={({ route }: any) => ({
        headerShown: false,
        tabBarActiveTintColor: '#e5293e',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: { backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, height: 60 },
        tabBarIcon: ({ color, size }: any) => {
          if (route.name === 'Home') return <Ionicons name="fast-food" size={size} color={color} />;
          if (route.name === 'Estabelecimentos') return <Ionicons name="storefront" size={size} color={color} />;
          if (route.name === 'Pedidos') return <Ionicons name="receipt" size={size} color={color} />;
          if (route.name === 'Carrinho') {
            return (
              <View>
                <Ionicons name="cart" size={size} color={color} />
                {state.items.length > 0 && (
                  <View style={{
                    position: 'absolute',
                    right: -8,
                    top: -4,
                    backgroundColor: '#e5293e',
                    borderRadius: 10,
                    width: 20,
                    height: 20,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{state.items.length}</Text>
                  </View>
                )}
              </View>
            );
          }
          return null;
        },
      })}
    >
      <Tab.Screen name="Home" component={require('./screens/EstabelecimentoListScreen').default} options={{ title: 'Início' }} />
      <Tab.Screen name="Pedidos" component={require('./screens/PedidoListScreen').default} />
      <Tab.Screen name="Carrinho" component={require('./screens/CheckoutScreen').default} />
    </Tab.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    registerForPushNotifications();
  }, []);

  return (
    <CartProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="HomeTabs" component={MainTabs} options={{ headerShown: false }} />
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
    </CartProvider>
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

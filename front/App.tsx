import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import React, { useEffect } from 'react';
import { verifyInstallation } from 'nativewind';
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
import GerenciarCategoriasProdutoScreen from './screens/GerenciarCategoriasProdutoScreen';
import MeusCartoesScreen from './screens/MeusCartoesScreen';
import PixPaymentConfirmationScreen from './screens/PixPaymentConfirmationScreen';
import ChatScreen from './screens/ChatScreen';
import ChatEstabelecimentoScreen from './screens/ChatEstabelecimentoScreen';
import ConversasEstabelecimentoScreen from './screens/ConversasEstabelecimentoScreen';
import NotificacoesScreen from './screens/NotificacoesScreen';
import * as Notifications from 'expo-notifications';
import { CartProvider, useCart } from './context/CartContext';
import api from './services/api';
import Constants from 'expo-constants';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Configurar handler de notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const registerForPushNotifications = async () => {
  try {
    // Verificar se está rodando no Expo Go (push notifications não funcionam no Expo Go SDK 53+)
    const isExpoGo = Constants.executionEnvironment === 'storeClient';
    
    if (isExpoGo) {
      console.log('⚠️ Push notifications não funcionam no Expo Go (SDK 53+)');
      console.log('ℹ️ Use um development build para testar push notifications:');
      console.log('   1. Execute: npx expo install expo-dev-client');
      console.log('   2. Execute: npx expo run:android ou npx expo run:ios');
      console.log('   3. Ou use: eas build --profile development');
      return;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('⚠️ Permissão para notificações foi negada.');
      return;
    }
    
    // Tentar obter token (requer projectId configurado no app.json)
    try {
      // Obter projectId do app.json ou Constants
      const extra = Constants.expoConfig?.extra as any;
      const projectId = extra?.eas?.projectId || extra?.projectId;

      if (!projectId) {
        console.log('⚠️ ProjectId não configurado. Push notifications podem não funcionar.');
        console.log('ℹ️ Execute: eas init (após fazer login com: eas login)');
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId as string,
      });
      const token = tokenData.data;
      console.log('📱 Token de notificação obtido:', token.substring(0, 30) + '...');
      
      // Enviar o token para o backend
      try {
        await api.post('/notificacoes/token', { token });
        console.log('✅ Token enviado para o backend com sucesso');
      } catch (apiError: any) {
        console.error('⚠️ Erro ao enviar token para o backend:', apiError.message);
        // Não falha se não conseguir enviar o token
      }
    } catch (tokenError: any) {
      // Tratar erro de Experience not found
      if (tokenError.message?.includes('EXPERIENCE_NOT_FOUND') || 
          tokenError.message?.includes('Experience with id')) {
        console.log('⚠️ O projectId configurado não existe no Expo.');
        console.log('ℹ️ Para criar um projectId válido:');
        console.log('   1. Execute: eas login (ou crie conta em https://expo.dev)');
        console.log('   2. Execute: eas init');
        console.log('   3. Isso criará um projectId válido automaticamente');
      } else if (tokenError.message?.includes('projectId')) {
        console.log('ℹ️ Configure o projectId no app.json');
        console.log('   Execute: eas init (após fazer login)');
      } else {
        console.error('❌ Erro ao obter token:', tokenError.message);
      }
    }
  } catch (error) {
    console.error('Erro ao registrar notificações:', error);
  }
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
          if (route.name === 'Perfil') return <Ionicons name="person-circle" size={size} color={color} />;
          return null;
        },
      })}
    >
      <Tab.Screen name="Home" component={require('./screens/EstabelecimentoListScreen').default} options={{ title: 'Início' }} />
      <Tab.Screen name="Pedidos" component={require('./screens/PedidoListScreen').default} />
      <Tab.Screen name="Carrinho" component={require('./screens/SacolaScreen').default} />
  <Tab.Screen name="Perfil" component={require('./screens/PerfilScreen').default} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    registerForPushNotifications();
    verifyInstallation();
  }, []);

  return (
    <CartProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="HomeTabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Detalhes do Produto' }} />
          <Stack.Screen name="Enderecos" component={require('./screens/EnderecoScreen').default} options={{ title: 'Meus Endereços' }} />
          <Stack.Screen name="DonoDashboard" component={DonoDashboardScreen} options={{ title: 'Painel do Dono' }} />
          <Stack.Screen name="CadastrarEstabelecimento" component={CadastrarEstabelecimentoScreen} options={{ title: 'Cadastrar Estabelecimento' }} />
          <Stack.Screen name="EditarEstabelecimento" component={EditarEstabelecimentoScreen} options={{ title: 'Editar Estabelecimento' }} />
          <Stack.Screen name="CadastrarProduto" component={CadastrarProdutoScreen} options={{ title: 'Cadastrar Produto' }} />
          <Stack.Screen name="ProdutosDoEstabelecimento" component={ProdutosDoEstabelecimentoScreen} options={{ headerShown: false }} />
          <Stack.Screen name="EditarProduto" component={EditarProdutoScreen} options={{ title: 'Editar Produto' }} />
          <Stack.Screen name="GerenciarCategoriasProduto" component={GerenciarCategoriasProdutoScreen} options={{ title: 'Categorias de Produto' }} />
          <Stack.Screen name="PedidosDoEstabelecimento" component={PedidosDoEstabelecimentoScreen} options={{ title: 'Pedidos do Estabelecimento' }} />
          <Stack.Screen name="MeusCartoes" component={MeusCartoesScreen} options={{ headerShown: false }} />
          {/* Fluxo de Checkout */}
          <Stack.Screen name="EnderecoEntrega" component={require('./screens/EnderecoEntregaScreen').default} options={{ headerShown: false }} />
          <Stack.Screen name="FormaPagamento" component={require('./screens/FormaPagamentoScreen').default} options={{ headerShown: false }} />
          <Stack.Screen name="RevisarPedido" component={require('./screens/RevisarPedidoScreen').default} options={{ headerShown: false }} />
          <Stack.Screen name="PixPaymentConfirmation" component={PixPaymentConfirmationScreen} options={{ headerShown: false }} />
          {/* Chat */}
          <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ChatEstabelecimento" component={ChatEstabelecimentoScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ConversasEstabelecimento" component={ConversasEstabelecimentoScreen} options={{ title: 'Conversas' }} />
          {/* Notificações */}
          <Stack.Screen name="Notificacoes" component={NotificacoesScreen} options={{ headerShown: false }} />
          {/* Avaliações */}
          <Stack.Screen name="MinhasAvaliacoes" component={require('./screens/MinhasAvaliacoesScreen').default} options={{ headerShown: false }} />
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

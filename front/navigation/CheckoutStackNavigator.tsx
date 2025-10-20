import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SacolaScreen from '../screens/SacolaScreen';
import EnderecoEntregaScreen from '../screens/EnderecoEntregaScreen';
import FormaPagamentoScreen from '../screens/FormaPagamentoScreen';
import RevisarPedidoScreen from '../screens/RevisarPedidoScreen';

const Stack = createStackNavigator();

const CheckoutStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#fff' },
      }}
    >
      <Stack.Screen 
        name="Sacola" 
        component={SacolaScreen}
        options={{
          title: 'SACOLA',
        }}
      />
      <Stack.Screen 
        name="EnderecoEntrega" 
        component={EnderecoEntregaScreen}
        options={{
          title: 'Endereço de Entrega',
        }}
      />
      <Stack.Screen 
        name="FormaPagamento" 
        component={FormaPagamentoScreen}
        options={{
          title: 'Forma de Pagamento',
        }}
      />
      <Stack.Screen 
        name="RevisarPedido" 
        component={RevisarPedidoScreen}
        options={{
          title: 'Revisar Pedido',
        }}
      />
    </Stack.Navigator>
  );
};

export default CheckoutStackNavigator;

import io from 'socket.io-client';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Função para criar o socket com token dinâmico
export const createSocket = async () => {
  const token = await AsyncStorage.getItem('jwtToken');
  const socket = io('http://localhost:3000', {
    auth: {
      token: token || '',
    },
  });

  socket.on('connect', () => {
    console.log('Conectado ao WebSocket');
  });

  socket.on('orderStatusUpdate', (data: { pedidoId: number; newStatus: string }) => {
    console.log('Atualização de status do pedido:', data);
  });

  socket.on('pedido_status', (data: { pedidoId: number; newStatus: string }) => {
    Alert.alert(
      'Atualização de Pedido',
      `Pedido ${data.pedidoId} foi atualizado para: ${data.newStatus}`,
      [{ text: 'OK' }]
    );
  });

  return socket;
};

// Exporte uma promise para uso imediato se necessário
export default createSocket;

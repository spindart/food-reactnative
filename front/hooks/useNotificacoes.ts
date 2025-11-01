import React, { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { NotificacaoService } from '../services/notificacaoService';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

export function useNotificacoes() {
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);
  const navigation = useNavigation();

  const loadCount = async () => {
    try {
      const count = await NotificacaoService.contarNaoLidas();
      setNotificacoesNaoLidas(count);
    } catch (error) {
      console.error('Erro ao carregar contagem:', error);
    }
  };

  useEffect(() => {
    loadCount();

    // Listener para notificações recebidas quando app está em foreground
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('📬 Notificação recebida:', notification);
      loadCount(); // Atualiza contador
    });

    // Listener para quando usuário toca na notificação
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('👆 Usuário tocou na notificação:', response);
      const data = response.notification.request.content.data;
      
      // Navegar conforme o tipo de notificação
      if (data?.pedidoId) {
        if (data?.tipo === 'MENSAGEM_RESTAURANTE') {
          navigation.navigate('Chat' as never, {
            pedidoId: data.pedidoId,
            estabelecimentoNome: data.estabelecimentoNome || 'Restaurante',
            pedidoStatus: data.pedidoStatus || 'pendente',
          } as never);
        } else {
          // Navegar para pedidos
          (navigation as any).navigate('HomeTabs', { screen: 'Pedidos' });
        }
      } else {
        // Navegar para tela de notificações
        navigation.navigate('Notificacoes' as never);
      }
    });

    // WebSocket para notificações em tempo real
    const ws = new WebSocket('ws://192.168.1.95:3000'); // Substitua pelo IP do seu servidor
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'notification') {
          // Nova notificação criada
          loadCount();
          
          // Mostrar notificação local
          Notifications.scheduleNotificationAsync({
            content: {
              title: data.notificacao.titulo,
              body: data.notificacao.mensagem,
              data: {
                pedidoId: data.notificacao.pedidoId,
                tipo: data.notificacao.tipo,
              },
              sound: true,
            },
            trigger: null, // Mostra imediatamente
          });
        }
      } catch (error) {
        console.error('Erro ao processar mensagem WebSocket:', error);
      }
    };

    return () => {
      subscription.remove();
      responseSubscription.remove();
      ws.close();
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadCount();
    }, [])
  );

  return { notificacoesNaoLidas, reload: loadCount };
}


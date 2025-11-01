import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

// Inicializar o Expo SDK
const expo = new Expo();

export interface PushNotificationData {
  to: string; // Expo push token
  sound?: 'default';
  title: string;
  body: string;
  data?: any;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
}

// Função auxiliar para validar token Expo
function isValidExpoPushToken(token: string): boolean {
  return (
    typeof token === 'string' &&
    (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')) &&
    token.endsWith(']')
  );
}

/**
 * Envia uma push notification via Expo
 */

export async function sendPushNotification(data: PushNotificationData) {
  try {
    // Validar o token do Expo
    if (!isValidExpoPushToken(data.to)) {
      console.error('❌ Token inválido:', data.to);
      return false;
    }

    const message: ExpoPushMessage = {
      to: data.to,
      sound: data.sound || 'default',
      title: data.title,
      body: data.body,
      data: data.data,
      badge: data.badge,
      priority: data.priority || 'high',
    };

    // Enviar notificação
    const chunks = expo.chunkPushNotifications([message]);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('❌ Erro ao enviar push notification:', error);
      }
    }

    // Verificar erros nos tickets
    const errors: any[] = [];
    tickets.forEach((ticket, index) => {
      if (ticket.status === 'error') {
        errors.push({
          error: ticket.message || 'Erro desconhecido',
          token: data.to,
          index,
        });
      }
    });

    if (errors.length > 0) {
      console.error('❌ Erros ao enviar push notifications:', errors);
      return false;
    }

    console.log('✅ Push notification enviada com sucesso:', data.to);
    return true;
  } catch (error: any) {
    console.error('❌ Erro ao enviar push notification:', error.message);
    return false;
  }
}

/**
 * Envia push notification para múltiplos tokens
 */
export async function sendPushNotificationsToMultiple(
  tokens: string[],
  title: string,
  body: string,
  data?: any
) {
  const validTokens = tokens.filter((token) => isValidExpoPushToken(token));

  if (validTokens.length === 0) {
    console.log('⚠️ Nenhum token válido para enviar');
    return;
  }

  const messages: ExpoPushMessage[] = validTokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high' as const,
  }));

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error('❌ Erro ao enviar push notifications:', error);
    }
  }

  // Verificar erros
  const errors: any[] = [];
  tickets.forEach((ticket, index) => {
    if (ticket.status === 'error') {
      errors.push({
        error: ticket.message,
        index,
      });
    }
  });

  if (errors.length > 0) {
    console.error('❌ Alguns erros ao enviar push notifications:', errors.length);
  } else {
    console.log(`✅ ${validTokens.length} push notifications enviadas com sucesso`);
  }
}


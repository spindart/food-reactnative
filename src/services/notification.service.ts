import { Server, WebSocket } from 'ws';

const clients: Set<WebSocket> = new Set();
let wss: Server | null = null;

export function initNotificationWebSocket(server: any) {
  wss = new Server({ server });
  wss.on('connection', (ws: WebSocket) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
  });
}

export class NotificationService {
  static notifyPedidoStatusChange(pedidoId: number, oldStatus: string, newStatus: string) {
    const timestamp = new Date().toISOString();
    const message = {
      type: 'pedido_status',
      pedidoId,
      oldStatus,
      newStatus,
      timestamp,
    };
    // Notificação por WebSocket
    if (wss) {
      for (const ws of clients) {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify(message));
        }
      }
    }
    // Log local
    console.log(`[${timestamp}] Pedido ${pedidoId}: status alterado de '${oldStatus}' para '${newStatus}'.`);
  }

  static notifyChatMessage(pedidoId: number, mensagem: any) {
    const timestamp = new Date().toISOString();
    const message = {
      type: 'chat_message',
      pedidoId,
      mensagem,
      timestamp,
    };
    // Notificação por WebSocket
    if (wss) {
      for (const ws of clients) {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify(message));
        }
      }
    }
    // Log local
    console.log(`[${timestamp}] Nova mensagem no chat do pedido ${pedidoId}.`);
  }

  static notifyTyping(pedidoId: number, userId: number, isTyping: boolean) {
    const timestamp = new Date().toISOString();
    const message = {
      type: 'chat_typing',
      pedidoId,
      userId,
      isTyping,
      timestamp,
    };
    // Notificação por WebSocket
    if (wss) {
      for (const ws of clients) {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify(message));
        }
      }
    }
  }
}

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
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
exports.initNotificationWebSocket = initNotificationWebSocket;
const ws_1 = require("ws");
const clients = new Set();
let wss = null;
function initNotificationWebSocket(server) {
    wss = new ws_1.Server({ server });
    wss.on('connection', (ws) => {
        clients.add(ws);
        ws.on('close', () => clients.delete(ws));
    });
}
class NotificationService {
    static notifyPedidoStatusChange(pedidoId, oldStatus, newStatus) {
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
exports.NotificationService = NotificationService;

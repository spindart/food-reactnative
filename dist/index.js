"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const estabelecimento_routes_1 = __importDefault(require("./routes/estabelecimento.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const produto_routes_1 = __importDefault(require("./routes/produto.routes"));
const pedido_routes_1 = __importDefault(require("./routes/pedido.routes"));
const usuario_routes_1 = __importDefault(require("./routes/usuario.routes"));
const pagamento_routes_1 = __importDefault(require("./routes/pagamento.routes"));
const notification_service_1 = require("./services/notification.service");
const error_middleware_1 = require("./services/error.middleware");
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use(express_1.default.json());
app.use('/api/estabelecimentos', estabelecimento_routes_1.default);
app.use('/api/produtos', produto_routes_1.default);
app.use('/api/pedidos', pedido_routes_1.default);
app.use('/api/auth', auth_routes_1.default);
app.use('/api/usuarios', usuario_routes_1.default);
app.use('/api/pagamento', pagamento_routes_1.default);
app.get('/', (req, res) => {
    res.send('Hello, World!');
});
app.use(error_middleware_1.errorHandler);
const server = http_1.default.createServer(app);
(0, notification_service_1.initNotificationWebSocket)(server);
server.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    console.log(`WebSocket notifications available at ws://localhost:${port}`);
});

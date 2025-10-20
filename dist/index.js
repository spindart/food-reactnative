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
const categoria_routes_1 = __importDefault(require("./routes/categoria.routes"));
const notification_service_1 = require("./services/notification.service");
const address_routes_1 = __importDefault(require("./routes/address.routes"));
const error_middleware_1 = require("./services/error.middleware");
const avaliacao_routes_1 = __importDefault(require("./routes/avaliacao.routes"));
const cartao_routes_1 = __importDefault(require("./routes/cartao.routes"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use(express_1.default.json());
app.use('/api/estabelecimentos', estabelecimento_routes_1.default);
app.use('/api/avaliacoes', avaliacao_routes_1.default);
app.use('/api/produtos', produto_routes_1.default);
app.use('/api/pedidos', pedido_routes_1.default);
app.use('/api/auth', auth_routes_1.default);
app.use('/api/usuarios', usuario_routes_1.default);
app.use('/api/pagamento', pagamento_routes_1.default);
app.use('/api/enderecos', address_routes_1.default);
app.use('/api/categorias', categoria_routes_1.default);
app.use('/api/cartoes', cartao_routes_1.default);
app.get('/', (req, res) => {
    res.send('Hello, World!');
});
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
app.use(error_middleware_1.errorHandler);
const server = http_1.default.createServer(app);
(0, notification_service_1.initNotificationWebSocket)(server);
if (process.env.NODE_ENV !== 'test') {
    server.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
        console.log(`WebSocket notifications available at ws://localhost:${port}`);
    });
}
exports.default = app;
if (process.env.NODE_ENV === 'test') {
    module.exports = app;
}

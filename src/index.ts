import express from 'express';
import http from 'http';
import estabelecimentoRoutes from './routes/estabelecimento.routes';
import authRoutes from './routes/auth.routes';
import produtoRoutes from './routes/produto.routes';
import pedidoRoutes from './routes/pedido.routes';
import usuarioRoutes from './routes/usuario.routes';
import pagamentoRoutes from './routes/pagamento.routes';
import categoriaRoutes from './routes/categoria.routes';
import { initNotificationWebSocket } from './services/notification.service';
import { errorHandler } from './services/error.middleware';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/estabelecimentos', estabelecimentoRoutes);
app.use('/api/produtos', produtoRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/pagamento', pagamentoRoutes);
app.use('/api/categorias', categoriaRoutes);

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.use(errorHandler);

const server = http.createServer(app);
initNotificationWebSocket(server);

if (process.env.NODE_ENV !== 'test') {
  server.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    console.log(`WebSocket notifications available at ws://localhost:${port}`);
  });
}

export default app;

if (process.env.NODE_ENV === 'test') {
  module.exports = app;
}

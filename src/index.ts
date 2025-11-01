import 'dotenv/config';
import express from 'express';
import http from 'http';
import estabelecimentoRoutes from './routes/estabelecimento.routes';
import authRoutes from './routes/auth.routes';
import produtoRoutes from './routes/produto.routes';
import pedidoRoutes from './routes/pedido.routes';
import usuarioRoutes from './routes/usuario.routes';
import pagamentoRoutes from './routes/pagamento.routes';
import categoriaRoutes from './routes/categoria.routes';
import produtoCategoriaRoutes from './routes/produto-categoria.routes';
import { initNotificationWebSocket } from './services/notification.service';
import addressRoutes from './routes/address.routes';
import { errorHandler } from './services/error.middleware';
import avaliacaoRoutes from './routes/avaliacao.routes';
import cartaoRoutes from './routes/cartao.routes';
import whatsappRoutes from './routes/whatsapp.routes';
import chatRoutes from './routes/chat.routes';

const app = express();
const port = process.env.PORT || 3000;

// Aumenta o limite do corpo para permitir imagens base64 (data URI)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/api/estabelecimentos', estabelecimentoRoutes);
app.use('/api/avaliacoes', avaliacaoRoutes);
app.use('/api/produtos', produtoRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/pagamento', pagamentoRoutes);
app.use('/api/enderecos', addressRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/produto-categorias', produtoCategoriaRoutes);
app.use('/api/cartoes', cartaoRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/chat', chatRoutes);

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

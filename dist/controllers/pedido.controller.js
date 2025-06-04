"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PedidoController = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const notification_service_1 = require("../services/notification.service");
const prisma = new client_1.PrismaClient();
const pedidoSchema = zod_1.z.object({
    clienteId: zod_1.z.number().int().positive(),
    estabelecimentoId: zod_1.z.number().int().positive(),
    produtos: zod_1.z.array(zod_1.z.object({
        produtoId: zod_1.z.number().int().positive(),
        quantidade: zod_1.z.number().int().positive(),
    })).min(1, 'A lista de produtos não pode ser vazia'),
});
class PedidoController {
    static async create(req, res) {
        const parse = pedidoSchema.safeParse(req.body);
        if (!parse.success) {
            res.status(400).json({ error: 'Dados inválidos', details: parse.error.errors });
            return;
        }
        const { clienteId, estabelecimentoId, produtos } = parse.data;
        try {
            const produtosDb = await prisma.produto.findMany({
                where: { id: { in: produtos.map(p => p.produtoId) }, estabelecimentoId },
            });
            if (produtosDb.length !== produtos.length) {
                res.status(400).json({ error: 'Um ou mais produtos não encontrados para este estabelecimento' });
                return;
            }
            let valorTotal = 0;
            const itensPedido = produtos.map((p) => {
                const produtoDb = produtosDb.find((db) => db.id === p.produtoId);
                const subtotal = produtoDb.preco * p.quantidade;
                valorTotal += subtotal;
                return {
                    produtoId: p.produtoId,
                    quantidade: p.quantidade,
                    precoUnitario: produtoDb.preco,
                };
            });
            const pedido = await prisma.pedido.create({
                data: {
                    clienteId,
                    estabelecimentoId,
                    status: 'pendente',
                    itens: {
                        create: itensPedido,
                    },
                },
                include: { itens: true },
            });
            res.status(201).json({ ...pedido, valorTotal });
            return;
        }
        catch (error) {
            res.status(400).json({ error: 'Erro ao criar pedido', details: error });
            return;
        }
    }
    static async getAll(req, res) {
        try {
            const pedidos = await prisma.pedido.findMany({
                include: { itens: true },
            });
            res.json(pedidos);
            return;
        }
        catch (error) {
            res.status(500).json({ error: 'Erro ao buscar pedidos', details: error });
            return;
        }
    }
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const pedido = await prisma.pedido.findUnique({
                where: { id: Number(id) },
                include: { itens: true },
            });
            if (!pedido) {
                res.status(404).json({ error: 'Pedido não encontrado' });
                return;
            }
            res.json(pedido);
            return;
        }
        catch (error) {
            res.status(500).json({ error: 'Erro ao buscar pedido', details: error });
            return;
        }
    }
    static async update(req, res) {
        try {
            const { id } = req.params;
            const parse = pedidoSchema.safeParse(req.body);
            if (!parse.success) {
                res.status(400).json({ error: 'Dados inválidos', details: parse.error.errors });
                return;
            }
            const { clienteId, estabelecimentoId, produtos } = parse.data;
            const pedido = await prisma.pedido.findUnique({ where: { id: Number(id) } });
            if (!pedido) {
                res.status(404).json({ error: 'Pedido não encontrado' });
                return;
            }
            // Atualiza o pedido e os itens
            // Buscar os produtos para obter o precoUnitario
            const produtosDb = await prisma.produto.findMany({
                where: { id: { in: produtos.map(p => p.produtoId) }, estabelecimentoId },
            });
            if (produtosDb.length !== produtos.length) {
                res.status(400).json({ error: 'Um ou mais produtos não encontrados para este estabelecimento' });
                return;
            }
            const itensPedido = produtos.map((p) => {
                const produtoDb = produtosDb.find((db) => db.id === p.produtoId);
                return {
                    produtoId: p.produtoId,
                    quantidade: p.quantidade,
                    precoUnitario: produtoDb.preco,
                };
            });
            const pedidoAtualizado = await prisma.pedido.update({
                where: { id: Number(id) },
                data: {
                    clienteId,
                    estabelecimentoId,
                    itens: {
                        deleteMany: {}, // Remove todos os itens existentes
                        create: itensPedido,
                    },
                },
                include: { itens: true },
            });
            res.json(pedidoAtualizado);
            return;
        }
        catch (error) {
            res.status(400).json({ error: 'Erro ao atualizar pedido', details: error });
            return;
        }
    }
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const pedido = await prisma.pedido.findUnique({ where: { id: Number(id) } });
            if (!pedido) {
                res.status(404).json({ error: 'Pedido não encontrado' });
                return;
            }
            await prisma.pedido.delete({ where: { id: Number(id) } });
            res.status(204).send();
            return;
        }
        catch (error) {
            res.status(500).json({ error: 'Erro ao deletar pedido', details: error });
            return;
        }
    }
    static async listByCliente(req, res) {
        try {
            const { clienteId } = req.params;
            const pedidos = await prisma.pedido.findMany({
                where: { clienteId: Number(clienteId) },
                include: { itens: true },
            });
            res.json(pedidos);
            return;
        }
        catch (error) {
            res.status(500).json({ error: 'Erro ao buscar pedidos do cliente', details: error });
            return;
        }
    }
    static async listByEstabelecimento(req, res) {
        try {
            const { estabelecimentoId } = req.params;
            const pedidos = await prisma.pedido.findMany({
                where: { estabelecimentoId: Number(estabelecimentoId) },
                include: { itens: true },
            });
            res.json(pedidos);
            return;
        }
        catch (error) {
            res.status(500).json({ error: 'Erro ao buscar pedidos do estabelecimento', details: error });
            return;
        }
    }
    static async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const pedido = await prisma.pedido.findUnique({ where: { id: Number(id) } });
            if (!pedido) {
                res.status(404).json({ error: 'Pedido não encontrado' });
                return;
            }
            let novoStatus;
            switch (pedido.status) {
                case 'pendente':
                    novoStatus = 'preparo';
                    break;
                case 'preparo':
                    novoStatus = 'entregue';
                    break;
                case 'entregue':
                case 'cancelado':
                    res.status(400).json({ error: 'Não é possível avançar o status deste pedido' });
                    return;
                default:
                    res.status(400).json({ error: 'Status inválido' });
                    return;
            }
            const pedidoAtualizado = await prisma.pedido.update({
                where: { id: Number(id) },
                data: { status: novoStatus },
            });
            notification_service_1.NotificationService.notifyPedidoStatusChange(pedido.id, pedido.status, novoStatus);
            res.json(pedidoAtualizado);
            return;
        }
        catch (error) {
            res.status(400).json({ error: 'Erro ao atualizar status do pedido', details: error });
            return;
        }
    }
}
exports.PedidoController = PedidoController;

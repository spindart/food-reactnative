"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProdutoController = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
const produtoSchema = zod_1.z.object({
    nome: zod_1.z.string().min(1, 'Nome é obrigatório'),
    descricao: zod_1.z.string().min(1, 'Descrição é obrigatória'),
    preco: zod_1.z.number().positive('Preço deve ser positivo'),
    estabelecimentoId: zod_1.z.number().int().positive('EstabelecimentoId deve ser um inteiro positivo'),
});
class ProdutoController {
    static async create(req, res) {
        const parse = produtoSchema.safeParse(req.body);
        if (!parse.success) {
            res.status(400).json({ error: 'Dados inválidos', details: parse.error.errors });
            return;
        }
        try {
            const { nome, descricao, preco, estabelecimentoId } = parse.data;
            const produto = await prisma.produto.create({
                data: { nome, descricao, preco, estabelecimentoId },
            });
            res.status(201).json(produto);
            return;
        }
        catch (error) {
            res.status(400).json({ error: 'Erro ao criar produto', details: error });
            return;
        }
    }
    static async getAll(req, res) {
        try {
            const produtos = await prisma.produto.findMany();
            res.json(produtos);
            return;
        }
        catch (error) {
            res.status(500).json({ error: 'Erro ao buscar produtos', details: error });
            return;
        }
    }
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const produto = await prisma.produto.findUnique({
                where: { id: Number(id) },
            });
            if (!produto) {
                res.status(404).json({ error: 'Produto não encontrado' });
                return;
            }
            res.json(produto);
            return;
        }
        catch (error) {
            res.status(500).json({ error: 'Erro ao buscar produto', details: error });
            return;
        }
    }
    static async update(req, res) {
        const parse = produtoSchema.safeParse(req.body);
        if (!parse.success) {
            res.status(400).json({ error: 'Dados inválidos', details: parse.error.errors });
            return;
        }
        try {
            const { id } = req.params;
            const { nome, descricao, preco, estabelecimentoId } = parse.data;
            const produto = await prisma.produto.update({
                where: { id: Number(id) },
                data: { nome, descricao, preco, estabelecimentoId },
            });
            res.json(produto);
            return;
        }
        catch (error) {
            res.status(400).json({ error: 'Erro ao atualizar produto', details: error });
            return;
        }
    }
    static async delete(req, res) {
        try {
            const { id } = req.params;
            await prisma.produto.delete({
                where: { id: Number(id) },
            });
            res.status(204).send();
            return;
        }
        catch (error) {
            res.status(400).json({ error: 'Erro ao deletar produto', details: error });
            return;
        }
    }
}
exports.ProdutoController = ProdutoController;

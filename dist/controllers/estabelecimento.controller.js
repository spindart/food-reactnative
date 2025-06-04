"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EstabelecimentoController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class EstabelecimentoController {
    static async create(req, res) {
        try {
            const { nome, descricao, endereco } = req.body;
            const estabelecimento = await prisma.estabelecimento.create({
                data: { nome, descricao, endereco },
            });
            res.status(201).json(estabelecimento);
            return;
        }
        catch (error) {
            res.status(400).json({ error: 'Erro ao criar estabelecimento', details: error });
            return;
        }
    }
    static async getAll(req, res) {
        try {
            const estabelecimentos = await prisma.estabelecimento.findMany();
            res.json(estabelecimentos);
            return;
        }
        catch (error) {
            res.status(500).json({ error: 'Erro ao buscar estabelecimentos', details: error });
            return;
        }
    }
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const estabelecimento = await prisma.estabelecimento.findUnique({
                where: { id: Number(id) },
            });
            if (!estabelecimento) {
                res.status(404).json({ error: 'Estabelecimento não encontrado' });
                return;
            }
            res.json(estabelecimento);
            return;
        }
        catch (error) {
            res.status(500).json({ error: 'Erro ao buscar estabelecimento', details: error });
            return;
        }
    }
    static async update(req, res) {
        try {
            const { id } = req.params;
            const { nome, descricao, endereco } = req.body;
            const estabelecimento = await prisma.estabelecimento.update({
                where: { id: Number(id) },
                data: { nome, descricao, endereco },
            });
            res.json(estabelecimento);
            return;
        }
        catch (error) {
            res.status(400).json({ error: 'Erro ao atualizar estabelecimento', details: error });
            return;
        }
    }
    static async delete(req, res) {
        try {
            const { id } = req.params;
            await prisma.estabelecimento.delete({
                where: { id: Number(id) },
            });
            res.status(204).send();
            return;
        }
        catch (error) {
            res.status(400).json({ error: 'Erro ao deletar estabelecimento', details: error });
            return;
        }
    }
}
exports.EstabelecimentoController = EstabelecimentoController;

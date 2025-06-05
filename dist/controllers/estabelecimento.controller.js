"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EstabelecimentoController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class EstabelecimentoController {
    static async create(req, res) {
        try {
            const { nome, descricao, endereco } = req.body;
            // Pega o id do usuário autenticado (dono)
            const user = req.user;
            if (!user || user.role !== 'dono') {
                res.status(403).json({ error: 'Apenas usuários com perfil de dono podem criar estabelecimentos.' });
                return;
            }
            const estabelecimento = await prisma.estabelecimento.create({
                data: { nome, descricao, endereco, donoId: user.id },
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
    static async listByDono(req, res) {
        try {
            const user = req.user;
            if (!user || user.role !== 'dono') {
                res.status(403).json({ error: 'Apenas donos podem acessar seus estabelecimentos.' });
                return;
            }
            const estabelecimentos = await prisma.estabelecimento.findMany({
                where: { donoId: user.id },
            });
            res.json(estabelecimentos);
            return;
        }
        catch (error) {
            res.status(500).json({ error: 'Erro ao buscar estabelecimentos do dono', details: error });
            return;
        }
    }
    static async avaliar(req, res) {
        try {
            const { estabelecimentoId, usuarioId, nota, comentario } = req.body;
            if (!estabelecimentoId || !usuarioId || !nota) {
                res.status(400).json({ error: 'Campos obrigatórios: estabelecimentoId, usuarioId, nota' });
                return;
            }
            // Cria avaliação
            await prisma.avaliacao.create({
                data: { estabelecimentoId, usuarioId, nota, comentario },
            });
            // Atualiza média e count
            const stats = await prisma.avaliacao.aggregate({
                where: { estabelecimentoId },
                _avg: { nota: true },
                _count: { id: true },
            });
            await prisma.estabelecimento.update({
                where: { id: estabelecimentoId },
                data: {
                    avaliacao: stats._avg.nota || 0,
                    avaliacoesCount: stats._count.id,
                },
            });
            res.status(201).json({ success: true });
        }
        catch (error) {
            res.status(500).json({ error: 'Erro ao registrar avaliação', details: error });
        }
    }
    static async getAvaliacoes(req, res) {
        try {
            const { estabelecimentoId } = req.params;
            const avaliacoes = await prisma.avaliacao.findMany({
                where: { estabelecimentoId: Number(estabelecimentoId) },
                include: { usuario: { select: { nome: true } } },
                orderBy: { createdAt: 'desc' },
            });
            res.json(avaliacoes);
        }
        catch (error) {
            res.status(500).json({ error: 'Erro ao buscar avaliações', details: error });
        }
    }
}
exports.EstabelecimentoController = EstabelecimentoController;

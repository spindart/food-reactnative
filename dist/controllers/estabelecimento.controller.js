"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EstabelecimentoController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class EstabelecimentoController {
    static async create(req, res) {
        try {
            const { nome, descricao, endereco, latitude, longitude, tempoEntregaMin, tempoEntregaMax, taxaEntrega, categorias, imagem } = req.body;
            // Pega o id do usuário autenticado (dono)
            const user = req.user;
            if (!user || user.role !== 'dono') {
                res.status(403).json({ error: 'Apenas usuários com perfil de dono podem criar estabelecimentos.' });
                return;
            }
            if (categorias && categorias.length > 3) {
                res.status(400).json({ error: 'Selecione no máximo 3 categorias.' });
                return;
            }
            let categoriaConnect = [];
            if (categorias && categorias.length > 0) {
                categoriaConnect = await Promise.all(categorias.map(async (nome) => {
                    let cat = await prisma.categoria.findUnique({ where: { nome } });
                    if (!cat)
                        cat = await prisma.categoria.create({ data: { nome } });
                    return { id: cat.id };
                }));
            }
            const estabelecimento = await prisma.estabelecimento.create({
                data: {
                    nome,
                    descricao,
                    endereco,
                    latitude,
                    longitude,
                    donoId: user.id,
                    tempoEntregaMin: tempoEntregaMin ?? 30,
                    tempoEntregaMax: tempoEntregaMax ?? 50,
                    taxaEntrega: taxaEntrega ?? 5.0,
                    categorias: { connect: categoriaConnect },
                    imagem: imagem ?? undefined,
                },
                include: { categorias: true },
            });
            res.status(201).json(estabelecimento);
            return;
        }
        catch (error) {
            res.status(400).json({ error: 'Erro ao criar estabelecimento', details: error });
            return;
        }
    }
    static async update(req, res) {
        try {
            const { id } = req.params;
            const { nome, descricao, endereco, latitude, longitude, tempoEntregaMin, tempoEntregaMax, taxaEntrega, categorias } = req.body;
            if (categorias && categorias.length > 3) {
                res.status(400).json({ error: 'Selecione no máximo 3 categorias.' });
                return;
            }
            let categoriaConnect = [];
            if (categorias && categorias.length > 0) {
                categoriaConnect = await Promise.all(categorias.map(async (nome) => {
                    let cat = await prisma.categoria.findUnique({ where: { nome } });
                    if (!cat)
                        cat = await prisma.categoria.create({ data: { nome } });
                    return { id: cat.id };
                }));
            }
            const estabelecimento = await prisma.estabelecimento.update({
                where: { id: Number(id) },
                data: {
                    nome,
                    descricao,
                    endereco,
                    latitude,
                    longitude,
                    tempoEntregaMin,
                    tempoEntregaMax,
                    taxaEntrega,
                    categorias: categorias ? { set: categoriaConnect } : undefined,
                },
                include: { categorias: true },
            });
            res.json(estabelecimento);
            return;
        }
        catch (error) {
            res.status(400).json({ error: 'Erro ao atualizar estabelecimento', details: error });
            return;
        }
    }
    static async getAll(req, res) {
        try {
            const estabelecimentos = await prisma.estabelecimento.findMany({
                include: { categorias: true },
            });
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
                include: { categorias: true },
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
                include: { categorias: true }, // Garante que imagem seja incluída
            });
            // Prisma já retorna o campo imagem se ele existir no schema e no banco
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
            console.log('Middleware user:', req.user); // Log the user object from middleware
            const { estabelecimentoId, nota, comentario } = req.body;
            const usuarioId = req.user?.id; // Use authenticated user's ID
            console.log('Received data:', { estabelecimentoId, nota, comentario, usuarioId });
            if (!estabelecimentoId || nota === undefined || nota === null) {
                res.status(400).json({ error: 'Campos obrigatórios: estabelecimentoId, nota' });
                return;
            }
            if (nota < 0 || nota > 5) {
                res.status(400).json({ error: 'A nota deve estar entre 0 e 5.' });
                return;
            }
            // Ensure IDs are integers
            const estabelecimentoIdInt = parseInt(estabelecimentoId, 10);
            const usuarioIdInt = parseInt(usuarioId, 10);
            console.log('Parsed IDs:', { estabelecimentoIdInt, usuarioIdInt });
            if (isNaN(estabelecimentoIdInt) || isNaN(usuarioIdInt)) {
                res.status(400).json({ error: 'IDs inválidos.' });
                return;
            }
            // Validate existence of estabelecimentoId
            const estabelecimento = await prisma.estabelecimento.findUnique({
                where: { id: estabelecimentoIdInt },
            });
            if (!estabelecimento) {
                res.status(404).json({ error: 'Estabelecimento não encontrado' });
                return;
            }
            // Validate existence of usuarioId
            const usuario = await prisma.usuario.findUnique({
                where: { id: usuarioIdInt },
            });
            if (!usuario) {
                res.status(404).json({ error: 'Usuário não encontrado' });
                return;
            }
            // Cria avaliação
            const avaliacao = await prisma.avaliacao.create({
                data: { estabelecimentoId: estabelecimentoIdInt, usuarioId: usuarioIdInt, nota, comentario },
            });
            // Atualiza média e count
            const stats = await prisma.avaliacao.aggregate({
                where: { estabelecimentoId: estabelecimentoIdInt },
                _avg: { nota: true },
                _count: { id: true },
            });
            await prisma.estabelecimento.update({
                where: { id: estabelecimentoIdInt },
                data: {
                    avaliacao: stats._avg.nota || 0,
                    avaliacoesCount: stats._count.id,
                },
            });
            res.status(201).json(avaliacao);
        }
        catch (error) {
            console.error('Erro ao registrar avaliação:', error);
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

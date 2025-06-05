"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoriaController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class CategoriaController {
    static async getAll(req, res) {
        try {
            const categorias = await prisma.categoria.findMany();
            res.json(categorias);
        }
        catch (error) {
            res.status(500).json({ error: 'Erro ao buscar categorias', details: error });
        }
    }
}
exports.CategoriaController = CategoriaController;

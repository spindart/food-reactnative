"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsuarioController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class UsuarioController {
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const usuario = await prisma.usuario.findUnique({
                where: { id: Number(id) },
                select: { id: true, nome: true, email: true, role: true, mercadoPagoCustomerId: true },
            });
            if (!usuario) {
                res.status(404).json({ error: 'Usuário não encontrado' });
                return;
            }
            res.json(usuario);
            return;
        }
        catch (error) {
            res.status(500).json({ error: 'Erro ao buscar usuário', details: error });
            return;
        }
    }
}
exports.UsuarioController = UsuarioController;

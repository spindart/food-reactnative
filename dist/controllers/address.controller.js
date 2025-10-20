"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class AddressController {
    static async setDefault(req, res) {
        try {
            const user = req.user;
            if (!user) {
                res.status(401).json({ error: 'Não autenticado' });
                return;
            }
            const { id } = req.params;
            console.log(`Definindo endereço ${id} como padrão para usuário ${user.id}`);
            // Verificar se o endereço existe e pertence ao usuário
            const addressExists = await prisma.address.findFirst({
                where: {
                    id: Number(id),
                    usuarioId: user.id
                }
            });
            if (!addressExists) {
                res.status(404).json({ error: 'Endereço não encontrado ou não pertence ao usuário' });
                return;
            }
            // Remove isDefault de todos os endereços do usuário
            await prisma.address.updateMany({
                where: { usuarioId: user.id },
                data: { isDefault: false },
            });
            // Marca o endereço selecionado como padrão
            const addr = await prisma.address.update({
                where: { id: Number(id) },
                data: { isDefault: true },
            });
            console.log('Endereço definido como padrão:', addr);
            res.json(addr);
        }
        catch (error) {
            console.error('Erro ao definir endereço padrão:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async list(req, res) {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        const addresses = await prisma.address.findMany({ where: { usuarioId: user.id } });
        res.json(addresses);
    }
    static async create(req, res) {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        const { label, address, latitude, longitude } = req.body;
        // Verifica se já existe algum endereço para o usuário
        const count = await prisma.address.count({ where: { usuarioId: user.id } });
        const addr = await prisma.address.create({
            data: {
                usuarioId: user.id,
                label,
                address,
                latitude,
                longitude,
                isDefault: count === 0, // Se for o primeiro, já salva como padrão
            },
        });
        res.status(201).json(addr);
    }
    static async update(req, res) {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        const { id } = req.params;
        const { label, address, latitude, longitude } = req.body;
        const addr = await prisma.address.update({
            where: { id: Number(id) },
            data: { label, address, latitude, longitude },
        });
        res.json(addr);
    }
    static async remove(req, res) {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        const { id } = req.params;
        await prisma.address.delete({ where: { id: Number(id) } });
        res.status(204).send();
    }
}
exports.AddressController = AddressController;

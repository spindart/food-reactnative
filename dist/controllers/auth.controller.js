"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
class AuthController {
    static async register(req, res) {
        try {
            const { nome, email, senha, role } = req.body;
            const existing = await prisma.usuario.findUnique({ where: { email } });
            if (existing) {
                res.status(400).json({ error: 'E-mail já cadastrado' });
                return;
            }
            const hashed = await bcryptjs_1.default.hash(senha, 10);
            const usuario = await prisma.usuario.create({
                data: { nome, email, senha: hashed, role },
            });
            res.status(201).json({ id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role });
        }
        catch (error) {
            res.status(400).json({ error: 'Erro ao registrar usuário', details: error });
        }
    }
    static async login(req, res) {
        try {
            const { email, senha } = req.body;
            const usuario = await prisma.usuario.findUnique({ where: { email } });
            if (!usuario) {
                res.status(401).json({ error: 'Credenciais inválidas' });
                return;
            }
            const valid = await bcryptjs_1.default.compare(senha, usuario.senha);
            if (!valid) {
                res.status(401).json({ error: 'Credenciais inválidas' });
                return;
            }
            const token = jsonwebtoken_1.default.sign({
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                role: usuario.role
            }, JWT_SECRET, { expiresIn: '1d' });
            res.json({ token });
        }
        catch (error) {
            res.status(400).json({ error: 'Erro ao autenticar', details: error });
        }
    }
}
exports.AuthController = AuthController;

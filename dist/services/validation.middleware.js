"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usuarioLoginSchema = exports.usuarioRegisterSchema = exports.pedidoSchema = exports.produtoSchema = exports.estabelecimentoSchema = void 0;
exports.validateBody = validateBody;
const zod_1 = require("zod");
// Esquema para Estabelecimento
exports.estabelecimentoSchema = zod_1.z.object({
    nome: zod_1.z.string().min(1, 'Nome é obrigatório'),
    descricao: zod_1.z.string().min(1, 'Descrição é obrigatória'),
    endereco: zod_1.z.string().min(1, 'Endereço é obrigatório'),
});
// Esquema para Produto
exports.produtoSchema = zod_1.z.object({
    nome: zod_1.z.string().min(1, 'Nome é obrigatório'),
    descricao: zod_1.z.string().min(1, 'Descrição é obrigatória'),
    preco: zod_1.z.number().positive('Preço deve ser positivo'),
    estabelecimentoId: zod_1.z.number().int().positive('EstabelecimentoId deve ser um inteiro positivo'),
});
// Esquema para Pedido
exports.pedidoSchema = zod_1.z.object({
    clienteId: zod_1.z.number().int().positive(),
    estabelecimentoId: zod_1.z.number().int().positive(),
    produtos: zod_1.z.array(zod_1.z.object({
        produtoId: zod_1.z.number().int().positive(),
        quantidade: zod_1.z.number().int().positive(),
    })).min(1, 'A lista de produtos não pode ser vazia'),
});
// Esquema para Usuário (registro)
exports.usuarioRegisterSchema = zod_1.z.object({
    nome: zod_1.z.string().min(1, 'Nome é obrigatório'),
    email: zod_1.z.string().email('E-mail inválido'),
    senha: zod_1.z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    role: zod_1.z.enum(['cliente', 'dono', 'admin']),
});
// Esquema para Usuário (login)
exports.usuarioLoginSchema = zod_1.z.object({
    email: zod_1.z.string().email('E-mail inválido'),
    senha: zod_1.z.string().min(1, 'Senha é obrigatória'),
});
// Middleware genérico para validação Zod
function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({ error: 'Dados inválidos', details: result.error.errors });
            return;
        }
        req.body = result.data;
        next();
    };
}

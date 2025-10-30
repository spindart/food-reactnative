import { z } from 'zod';

// Esquema para Estabelecimento
export const estabelecimentoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  endereco: z.string().min(1, 'Endereço é obrigatório'),
  taxaEntrega: z.number().positive('Taxa de entrega deve ser positiva'),
  tempoEntregaMin: z.number().int().positive('Tempo mínimo deve ser positivo'),
  tempoEntregaMax: z.number().int().positive('Tempo máximo deve ser positivo'),
  categorias: z.array(z.any()).optional(),
  imagem: z.string().optional(),
  // Funcionamento
  diasAbertos: z.array(z.number().int().min(0).max(6)).optional(),
  horaAbertura: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  horaFechamento: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  aberto: z.boolean().optional(),
});

// Esquema para Produto
export const produtoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional().nullable(),
  preco: z.number().positive('Preço deve ser positivo'),
  estabelecimentoId: z.number().int().positive('EstabelecimentoId deve ser um inteiro positivo'),
  produtoCategoriaId: z.number().int().positive().optional().nullable(),
  imagem: z.string().optional().nullable(),
});

// Esquema para Pedido
export const pedidoSchema = z.object({
  clienteId: z.number().int().positive(),
  estabelecimentoId: z.number().int().positive(),
  produtos: z.array(
    z.object({
      produtoId: z.number().int().positive(),
      quantidade: z.number().int().positive(),
    })
  ).min(1, 'A lista de produtos não pode ser vazia'),
});

// Esquema para Usuário (registro)
export const usuarioRegisterSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  role: z.enum(['cliente', 'dono', 'admin']),
});

// Esquema para Usuário (login)
export const usuarioLoginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(1, 'Senha é obrigatória'),
});

// Middleware genérico para validação Zod
export function validateBody(schema: z.ZodSchema<any>) {
  return (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Dados inválidos', details: result.error.errors });
      return;
    }
    req.body = result.data;
    next();
  };
}

// Schema simples para alternar flag "aberto"
export const abertoSchema = z.object({
  aberto: z.boolean(),
});
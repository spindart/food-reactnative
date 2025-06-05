import { Router, Request, Response, NextFunction } from 'express';
import { ProdutoController } from '../controllers/produto.controller';
import { authenticateJWT } from '../services/auth.middleware';
import { validateBody, produtoSchema } from '../services/validation.middleware';

const router = Router();

router.post('/', authenticateJWT, validateBody(produtoSchema), async (req, res) => {
  await ProdutoController.create(req, res);
});
router.get('/', async (req, res) => {
  await ProdutoController.getAll(req, res);
});
router.get('/:id', async (req, res) => {
  await ProdutoController.getById(req, res);
});
router.put('/:id', authenticateJWT, validateBody(produtoSchema), async (req, res) => {
  await ProdutoController.update(req, res);
});
router.delete('/:id', authenticateJWT, async (req, res) => {
  await ProdutoController.delete(req, res);
});
// Atualiza apenas a imagem do produto
router.patch('/:id/imagem', authenticateJWT, async (req, res) => {
  await ProdutoController.updateImagem(req, res);
});

export default router;

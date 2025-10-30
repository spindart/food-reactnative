import { Router } from 'express';
import { ProdutoCategoriaController } from '../controllers/produtoCategoria.controller';
import { authenticateJWT } from '../services/auth.middleware';

const router = Router();

// Lista categorias de produto de um estabelecimento
router.get('/estabelecimento/:estabelecimentoId', async (req, res) => {
  await ProdutoCategoriaController.listByEstabelecimento(req, res);
});

// CRUD (somente dono)
router.post('/estabelecimento/:estabelecimentoId', authenticateJWT, async (req, res) => {
  await ProdutoCategoriaController.create(req, res);
});
router.put('/estabelecimento/:estabelecimentoId/:id', authenticateJWT, async (req, res) => {
  await ProdutoCategoriaController.update(req, res);
});
router.delete('/estabelecimento/:estabelecimentoId/:id', authenticateJWT, async (req, res) => {
  await ProdutoCategoriaController.remove(req, res);
});

export default router;



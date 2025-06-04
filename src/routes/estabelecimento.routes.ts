import { Router, Request, Response, NextFunction } from 'express';
import { EstabelecimentoController } from '../controllers/estabelecimento.controller';
import { authenticateJWT } from '../services/auth.middleware';
import { validateBody, estabelecimentoSchema } from '../services/validation.middleware';

const router = Router();

router.post('/', authenticateJWT, validateBody(estabelecimentoSchema), async (req, res) => {
  await EstabelecimentoController.create(req, res);
});
router.get('/', async (req, res) => {
  await EstabelecimentoController.getAll(req, res);
});
router.get('/meus', authenticateJWT, async (req, res) => {
  await EstabelecimentoController.listByDono(req, res);
});
router.get('/:id', async (req, res) => {
  await EstabelecimentoController.getById(req, res);
});
router.put('/:id', authenticateJWT, validateBody(estabelecimentoSchema), async (req, res) => {
  await EstabelecimentoController.update(req, res);
});
router.delete('/:id', authenticateJWT, async (req, res) => {
  await EstabelecimentoController.delete(req, res);
});

export default router;

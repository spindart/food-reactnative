import { Router, Request, Response, NextFunction } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateBody, usuarioRegisterSchema, usuarioLoginSchema } from '../services/validation.middleware';

const router = Router();

router.post('/register', validateBody(usuarioRegisterSchema), async (req, res) => {
  await AuthController.register(req, res);
});
router.post('/login', validateBody(usuarioLoginSchema), async (req, res) => {
  await AuthController.login(req, res);
});
router.post('/logout', (req, res) => {
  res.status(200).json({ message: 'Logout realizado com sucesso' });
});

export default router;

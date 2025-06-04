import { Router } from 'express';
import { UsuarioController } from '../controllers/usuario.controller';

const router = Router();

router.get('/:id', UsuarioController.getById);

export default router;

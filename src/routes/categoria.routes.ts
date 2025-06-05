import { Router } from 'express';
import { CategoriaController } from '../controllers/categoria.controller';

const router = Router();

router.get('/', CategoriaController.getAll);

export default router;

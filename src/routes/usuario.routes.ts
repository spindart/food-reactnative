import { Router } from 'express';
import { UsuarioController } from '../controllers/usuario.controller';
import { authenticateJWT } from '../services/auth.middleware';
import { validateBody, updateProfileSchema, alterarSenhaSchema } from '../services/validation.middleware';

const router = Router();

// Rotas protegidas para perfil do usuário autenticado (DEVEM vir ANTES de /:id)
router.get('/perfil', authenticateJWT, UsuarioController.getPerfil);
router.put('/perfil', authenticateJWT, validateBody(updateProfileSchema), UsuarioController.updatePerfil);
router.put('/perfil/senha', authenticateJWT, validateBody(alterarSenhaSchema), UsuarioController.alterarSenha);

// Rota para buscar por ID (deve vir DEPOIS para não conflitar com /perfil)
router.get('/:id', UsuarioController.getById);

export default router;

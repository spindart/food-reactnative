import { Router } from 'express';
import { AddressController } from '../controllers/address.controller';
import { authenticateJWT } from '../services/auth.middleware';

const router = Router();

router.get('/', authenticateJWT, AddressController.list);
router.post('/', authenticateJWT, AddressController.create);
router.put('/:id', authenticateJWT, AddressController.update);
router.delete('/:id', authenticateJWT, AddressController.remove);
router.post('/:id/padrao', authenticateJWT, AddressController.setDefault);

export default router;

import { Router } from 'express';
import { WhatsAppController } from '../controllers/whatsapp.controller';

const router = Router();

/**
 * POST /whatsapp/send-code
 * Body: { phone: string }
 */
router.post('/send-code', async (req, res) => {
  await WhatsAppController.sendCode(req, res);
});

/**
 * POST /whatsapp/verify-code
 * Body: { phone: string, code: string }
 */
router.post('/verify-code', async (req, res) => {
  await WhatsAppController.verifyCode(req, res);
});

export default router;






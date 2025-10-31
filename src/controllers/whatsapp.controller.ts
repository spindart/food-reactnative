import { Request, Response } from 'express';
import { WhatsAppService } from '../services/whatsapp.service';

export class WhatsAppController {
  /**
   * POST /whatsapp/send-code
   * Envia código de verificação via WhatsApp
   */
  static async sendCode(req: Request, res: Response): Promise<void> {
    try {
      const { phone } = req.body;

      if (!phone) {
        res.status(400).json({ error: 'Telefone é obrigatório' });
        return;
      }

      const result = await WhatsAppService.sendVerificationCode(phone);
      
      res.status(200).json(result);
    } catch (error: any) {
      console.error('Erro ao enviar código:', error);
      res.status(500).json({ 
        error: error.message || 'Erro ao enviar código de verificação' 
      });
    }
  }

  /**
   * POST /whatsapp/verify-code
   * Verifica código de verificação
   */
  static async verifyCode(req: Request, res: Response): Promise<void> {
    try {
      const { phone, code } = req.body;

      if (!phone || !code) {
        res.status(400).json({ error: 'Telefone e código são obrigatórios' });
        return;
      }

      if (code.length !== 6 || !/^\d{6}$/.test(code)) {
        res.status(400).json({ error: 'Código deve ter 6 dígitos numéricos' });
        return;
      }

      const isValid = await WhatsAppService.verifyCode(phone, code);
      
      if (isValid) {
        res.status(200).json({ 
          success: true, 
          message: 'Código verificado com sucesso!' 
        });
      } else {
        res.status(400).json({ 
          error: 'Código inválido ou expirado' 
        });
      }
    } catch (error: any) {
      console.error('Erro ao verificar código:', error);
      res.status(500).json({ 
        error: error.message || 'Erro ao verificar código' 
      });
    }
  }
}





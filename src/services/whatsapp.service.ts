import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Armazenar códigos temporariamente em memória (em produção, usar Redis)
const verificationCodes = new Map<string, { code: string; expiresAt: Date }>();

/**
 * Gera um código de verificação aleatório de 6 dígitos
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Envia código de verificação via WhatsApp
 * 
 * OPÇÕES DE INTEGRAÇÃO:
 * 1. Evolution API (Grátis, open-source) - https://evolution-api.com
 * 2. Twilio WhatsApp API (Pago, robusto) - https://www.twilio.com/docs/whatsapp
 * 3. WhatsApp Business API oficial (Pago, oficial)
 * 4. Baileys (Grátis, biblioteca Node.js)
 * 
 * Por enquanto, apenas simula o envio e armazena o código.
 * Para implementar, substitua a lógica de envio abaixo.
 */
export class WhatsAppService {
  /**
   * Envia código de verificação via WhatsApp
   */
  static async sendVerificationCode(phone: string): Promise<{ success: boolean; message: string }> {
    try {
      // Limpar número do telefone (apenas números)
      const cleanPhone = phone.replace(/\D/g, '');
      
      if (cleanPhone.length < 10 || cleanPhone.length > 11) {
        throw new Error('Número de telefone inválido');
      }

      // Formatar para WhatsApp (55 + DDD + número)
      const whatsappNumber = cleanPhone.startsWith('55') 
        ? cleanPhone 
        : `55${cleanPhone}`;

      // Gerar código
      const code = generateVerificationCode();
      
      // Armazenar código (expira em 5 minutos)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5);
      
      verificationCodes.set(whatsappNumber, { code, expiresAt });

      // ============================================
      // IMPLEMENTAR ENVIO REAL DE WHATSAPP AQUI
      // ============================================
      
      // OPÇÃO 1: Evolution API (Recomendado - Grátis)
      /*
      import axios from 'axios';
      
      const evolutionApiUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
      const evolutionApiKey = process.env.EVOLUTION_API_KEY;
      
      try {
        await axios.post(
          `${evolutionApiUrl}/message/sendText/${evolutionApiKey}`,
          {
            number: whatsappNumber,
            text: `Seu código de verificação é: ${code}\n\nEste código expira em 5 minutos.`
          }
        );
        console.log(`✅ Código enviado via Evolution API para ${whatsappNumber}`);
      } catch (error) {
        console.error('Erro ao enviar via Evolution API:', error);
        throw new Error('Erro ao enviar código via WhatsApp');
      }
      */

      // OPÇÃO 2: Twilio WhatsApp API
      /*
      import twilio from 'twilio';
      
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER; // formato: whatsapp:+5511999999999
      
      const client = twilio(accountSid, authToken);
      
      try {
        await client.messages.create({
          from: fromNumber,
          to: `whatsapp:+${whatsappNumber}`,
          body: `Seu código de verificação é: ${code}\n\nEste código expira em 5 minutos.`
        });
        console.log(`✅ Código enviado via Twilio para ${whatsappNumber}`);
      } catch (error) {
        console.error('Erro ao enviar via Twilio:', error);
        throw new Error('Erro ao enviar código via WhatsApp');
      }
      */

      // Por enquanto, apenas loga (para desenvolvimento)
      console.log(`📱 [SIMULAÇÃO] Código de verificação para ${whatsappNumber}: ${code}`);
      console.log(`⚠️  Em produção, implemente uma das opções acima!`);

      return {
        success: true,
        message: 'Código enviado com sucesso!',
      };
    } catch (error: any) {
      console.error('Erro ao enviar código WhatsApp:', error);
      throw new Error(error.message || 'Erro ao enviar código de verificação');
    }
  }

  /**
   * Verifica código de verificação
   */
  static async verifyCode(phone: string, code: string): Promise<boolean> {
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const whatsappNumber = cleanPhone.startsWith('55') 
        ? cleanPhone 
        : `55${cleanPhone}`;

      const stored = verificationCodes.get(whatsappNumber);

      if (!stored) {
        console.log(`❌ Código não encontrado para ${whatsappNumber}`);
        return false;
      }

      // Verificar expiração
      if (new Date() > stored.expiresAt) {
        verificationCodes.delete(whatsappNumber);
        console.log(`❌ Código expirado para ${whatsappNumber}`);
        return false;
      }

      // Verificar código
      if (stored.code !== code) {
        console.log(`❌ Código inválido para ${whatsappNumber}. Esperado: ${stored.code}, Recebido: ${code}`);
        return false;
      }

      // Código válido - remover do cache
      verificationCodes.delete(whatsappNumber);
      console.log(`✅ Código verificado com sucesso para ${whatsappNumber}`);

      // Atualizar telefone como verificado no banco
      await prisma.usuario.updateMany({
        where: { telefone: phone },
        data: { telefoneVerificado: true },
      });

      return true;
    } catch (error: any) {
      console.error('Erro ao verificar código:', error);
      return false;
    }
  }

  /**
   * Limpa códigos expirados (chamar periodicamente)
   */
  static cleanExpiredCodes(): void {
    const now = new Date();
    for (const [phone, data] of verificationCodes.entries()) {
      if (now > data.expiresAt) {
        verificationCodes.delete(phone);
      }
    }
  }
}

// Limpar códigos expirados a cada 10 minutos
setInterval(() => {
  WhatsAppService.cleanExpiredCodes();
}, 10 * 60 * 1000);






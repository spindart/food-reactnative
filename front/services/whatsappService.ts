import api from './api';

/**
 * Serviço para envio de código de verificação via WhatsApp
 * Por enquanto, é uma simulação que sempre retorna sucesso
 * Em produção, integraria com uma API real de WhatsApp (Twilio, WhatsApp Business API, etc.)
 */

export interface SendVerificationCodePayload {
  phone: string;
}

export interface VerifyCodePayload {
  phone: string;
  code: string;
}

/**
 * Envia código de verificação via WhatsApp
 * Agora usando o endpoint real do backend
 */
export const sendVerificationCode = async (payload: SendVerificationCodePayload) => {
  try {
    const response = await api.post('/whatsapp/send-code', payload);
    return response.data;
  } catch (error: any) {
    console.error('Erro ao enviar código:', error);
    throw new Error(error?.response?.data?.error || 'Erro ao enviar código de verificação');
  }
};

/**
 * Verifica código recebido via WhatsApp
 * Agora usando o endpoint real do backend
 */
export const verifyCode = async (payload: VerifyCodePayload): Promise<boolean> => {
  try {
    const response = await api.post('/whatsapp/verify-code', payload);
    return response.data.success === true;
  } catch (error: any) {
    console.error('Erro ao verificar código:', error);
    return false;
  }
};


// Serviço de OAuth para conectar contas de sellers ao Mercado Pago Marketplace
import axios from 'axios';
import * as crypto from 'crypto';

// Configurações do OAuth do Mercado Pago
const MERCADO_PAGO_CLIENT_ID = process.env.MERCADO_PAGO_CLIENT_ID || '';
const MERCADO_PAGO_CLIENT_SECRET = process.env.MERCADO_PAGO_CLIENT_SECRET || '';
const MERCADO_PAGO_REDIRECT_URI = process.env.MERCADO_PAGO_REDIRECT_URI || '';

// Chave para criptografia de tokens (deve estar no .env)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-cbc';

export class MarketplaceOAuthService {
  /**
   * Criptografa um token antes de armazenar no banco
   */
  private static encryptToken(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Descriptografa um token do banco
   */
  private static decryptToken(encryptedText: string): string {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Gera URL de autorização OAuth para o seller
   * GET /marketplace/oauth/authorize
   */
  static generateAuthorizationUrl(estabelecimentoId: number): string {
    const state = crypto.randomBytes(16).toString('hex'); // Estado para validar callback
    const scope = 'read write offline_access'; // Permissões necessárias
    
    const params = new URLSearchParams({
      client_id: MERCADO_PAGO_CLIENT_ID,
      redirect_uri: `${MERCADO_PAGO_REDIRECT_URI}?estabelecimentoId=${estabelecimentoId}`,
      response_type: 'code',
      platform_id: 'mp', // Identificador da plataforma
      state: `${estabelecimentoId}:${state}`, // Incluir ID do estabelecimento no state
    });

    return `https://auth.mercadopago.com/authorization?${params.toString()}`;
  }

  /**
   * Troca código de autorização por access token
   * POST /marketplace/oauth/token
   */
  static async exchangeCodeForToken(code: string, estabelecimentoId: number): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    user_id: string; // collector_id do seller
  }> {
    try {
      console.log('🔄 Trocando código por token para estabelecimento:', estabelecimentoId);

      const response = await axios.post(
        'https://api.mercadopago.com/oauth/token',
        {
          client_id: MERCADO_PAGO_CLIENT_ID,
          client_secret: MERCADO_PAGO_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: `${MERCADO_PAGO_REDIRECT_URI}?estabelecimentoId=${estabelecimentoId}`,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data.access_token || !response.data.user_id) {
        throw new Error('Resposta inválida do Mercado Pago');
      }

      console.log('✅ Token obtido com sucesso para seller:', response.data.user_id);

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        scope: response.data.scope,
        user_id: response.data.user_id.toString(),
      };
    } catch (error: any) {
      console.error('❌ Erro ao trocar código por token:', error.response?.data || error.message);
      throw new Error(`Erro ao obter token: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Atualiza access token usando refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    try {
      console.log('🔄 Renovando access token...');

      const response = await axios.post(
        'https://api.mercadopago.com/oauth/token',
        {
          client_id: MERCADO_PAGO_CLIENT_ID,
          client_secret: MERCADO_PAGO_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || refreshToken, // Mantém o mesmo se não vier novo
        expires_in: response.data.expires_in,
      };
    } catch (error: any) {
      console.error('❌ Erro ao renovar token:', error.response?.data || error.message);
      throw new Error(`Erro ao renovar token: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Criptografa e prepara tokens para armazenamento
   */
  static prepareTokensForStorage(accessToken: string, refreshToken: string): {
    encryptedAccessToken: string;
    encryptedRefreshToken: string;
  } {
    return {
      encryptedAccessToken: this.encryptToken(accessToken),
      encryptedRefreshToken: this.encryptToken(refreshToken),
    };
  }

  /**
   * Descriptografa tokens do banco
   */
  static decryptTokensFromStorage(encryptedAccessToken: string, encryptedRefreshToken: string): {
    accessToken: string;
    refreshToken: string;
  } {
    return {
      accessToken: this.decryptToken(encryptedAccessToken),
      refreshToken: this.decryptToken(encryptedRefreshToken),
    };
  }

  /**
   * Valida se o access token ainda é válido
   */
  static async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await axios.get('https://api.mercadopago.com/users/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      return !!response.data.id;
    } catch (error: any) {
      console.error('❌ Token inválido:', error.response?.status);
      return false;
    }
  }

  /**
   * Obtém informações do seller conectado
   */
  static async getSellerInfo(accessToken: string): Promise<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  }> {
    try {
      const response = await axios.get('https://api.mercadopago.com/users/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return {
        id: response.data.id.toString(),
        email: response.data.email,
        first_name: response.data.first_name || '',
        last_name: response.data.last_name || '',
      };
    } catch (error: any) {
      console.error('❌ Erro ao obter informações do seller:', error.response?.data || error.message);
      throw new Error(`Erro ao obter informações: ${error.response?.data?.message || error.message}`);
    }
  }
}


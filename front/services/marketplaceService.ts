// Serviço para APIs do Marketplace Mercado Pago
import api from './api';

export interface MarketplaceOAuthStatus {
  estabelecimento: {
    id: number;
    nome: string;
    mercadoPagoConnected: boolean;
    mercadoPagoCollectorId: string | null;
    mercadoPagoConnectedAt: string | null;
    applicationFeePercent: number;
    tokenValid: boolean;
  };
}

export interface MarketplaceOAuthResponse {
  authorizationUrl: string;
  estabelecimentoId: number;
}

export interface MarketplaceCallbackResponse {
  success: boolean;
  message: string;
  estabelecimento: {
    id: number;
    nome: string;
    mercadoPagoCollectorId: string | null;
    mercadoPagoConnected: boolean;
  };
  seller: {
    id: string;
    email: string;
    name: string;
  };
}

/**
 * Gera URL de autorização OAuth para conectar conta Mercado Pago
 */
export const getMarketplaceAuthorizationUrl = async (
  estabelecimentoId: number
): Promise<MarketplaceOAuthResponse> => {
  const response = await api.get(
    `/marketplace/oauth/authorize/${estabelecimentoId}`
  );
  return response.data;
};

/**
 * Verifica status da conexão OAuth do estabelecimento
 */
export const getMarketplaceOAuthStatus = async (
  estabelecimentoId: number
): Promise<MarketplaceOAuthStatus> => {
  const response = await api.get(
    `/marketplace/oauth/status/${estabelecimentoId}`
  );
  return response.data;
};

/**
 * Desconecta conta Mercado Pago do estabelecimento
 */
export const disconnectMarketplaceAccount = async (
  estabelecimentoId: number
): Promise<{ success: boolean; message: string }> => {
  const response = await api.post(
    `/marketplace/oauth/disconnect/${estabelecimentoId}`
  );
  return response.data;
};

/**
 * Renova access token do Mercado Pago
 */
export const refreshMarketplaceToken = async (
  estabelecimentoId: number
): Promise<{ success: boolean; message: string }> => {
  const response = await api.post(
    `/marketplace/oauth/refresh/${estabelecimentoId}`
  );
  return response.data;
};

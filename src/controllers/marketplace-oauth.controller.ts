// Controller para OAuth do Marketplace
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MarketplaceOAuthService } from '../services/marketplace-oauth.service';

const prisma = new PrismaClient();

export class MarketplaceOAuthController {
  /**
   * GET /marketplace/oauth/authorize/:estabelecimentoId
   * Gera URL de autorização OAuth para o seller
   */
  static async authorize(req: Request, res: Response): Promise<void> {
    try {
      const { estabelecimentoId } = req.params;
      const user = (req as any).user;

      if (!user || user.role !== 'dono') {
        res.status(403).json({ error: 'Apenas donos podem conectar contas Mercado Pago' });
        return;
      }

      // Verificar se o estabelecimento pertence ao usuário
      const estabelecimento = await prisma.estabelecimento.findFirst({
        where: {
          id: Number(estabelecimentoId),
          donoId: user.id,
        },
      });

      if (!estabelecimento) {
        res.status(404).json({ error: 'Estabelecimento não encontrado ou não pertence a você' });
        return;
      }

      // Gerar URL de autorização
      const authUrl = MarketplaceOAuthService.generateAuthorizationUrl(Number(estabelecimentoId));

      res.json({
        authorizationUrl: authUrl,
        estabelecimentoId: Number(estabelecimentoId),
      });
    } catch (error: any) {
      console.error('❌ Erro ao gerar URL de autorização:', error);
      res.status(500).json({ error: 'Erro ao gerar URL de autorização', details: error.message });
    }
  }

  /**
   * GET /marketplace/oauth/callback
   * Callback do OAuth após autorização do seller
   */
  static async callback(req: Request, res: Response): Promise<void> {
    try {
      const { code, state, error } = req.query;

      if (error) {
        res.status(400).json({ error: 'Erro na autorização OAuth', details: error });
        return;
      }

      if (!code || !state) {
        res.status(400).json({ error: 'Código de autorização ou state não fornecidos' });
        return;
      }

      // Extrair estabelecimentoId do state
      const [estabelecimentoIdStr] = String(state).split(':');
      const estabelecimentoId = Number(estabelecimentoIdStr);

      if (isNaN(estabelecimentoId)) {
        res.status(400).json({ error: 'ID do estabelecimento inválido' });
        return;
      }

      // Trocar código por token
      const tokenData = await MarketplaceOAuthService.exchangeCodeForToken(
        String(code),
        estabelecimentoId
      );

      // Criptografar tokens antes de armazenar
      const { encryptedAccessToken, encryptedRefreshToken } =
        MarketplaceOAuthService.prepareTokensForStorage(
          tokenData.access_token,
          tokenData.refresh_token
        );

      // Obter informações do seller
      const sellerInfo = await MarketplaceOAuthService.getSellerInfo(tokenData.access_token);

      // Atualizar estabelecimento com dados do Mercado Pago
      const estabelecimento = await prisma.estabelecimento.update({
        where: { id: estabelecimentoId },
        data: {
          mercadoPagoCollectorId: sellerInfo.id,
          mercadoPagoAccessToken: encryptedAccessToken,
          mercadoPagoRefreshToken: encryptedRefreshToken,
          mercadoPagoConnected: true,
          mercadoPagoConnectedAt: new Date(),
        },
        include: {
          dono: {
            select: {
              id: true,
              nome: true,
              email: true,
            },
          },
        },
      });

      console.log('✅ Conta Mercado Pago conectada com sucesso:', {
        estabelecimentoId,
        collectorId: sellerInfo.id,
      });

      // Redirecionar para página de sucesso (ou retornar JSON)
      res.json({
        success: true,
        message: 'Conta Mercado Pago conectada com sucesso',
        estabelecimento: {
          id: estabelecimento.id,
          nome: estabelecimento.nome,
          mercadoPagoCollectorId: estabelecimento.mercadoPagoCollectorId,
          mercadoPagoConnected: estabelecimento.mercadoPagoConnected,
        },
        seller: {
          id: sellerInfo.id,
          email: sellerInfo.email,
          name: `${sellerInfo.first_name} ${sellerInfo.last_name}`,
        },
      });
    } catch (error: any) {
      console.error('❌ Erro no callback OAuth:', error);
      res.status(500).json({
        error: 'Erro ao processar callback OAuth',
        details: error.message,
      });
    }
  }

  /**
   * GET /marketplace/oauth/status/:estabelecimentoId
   * Verifica status da conexão OAuth
   */
  static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const { estabelecimentoId } = req.params;
      const user = (req as any).user;

      if (!user || user.role !== 'dono') {
        res.status(403).json({ error: 'Apenas donos podem verificar status' });
        return;
      }

      const estabelecimento = await prisma.estabelecimento.findFirst({
        where: {
          id: Number(estabelecimentoId),
          donoId: user.id,
        },
        select: {
          id: true,
          nome: true,
          mercadoPagoConnected: true,
          mercadoPagoCollectorId: true,
          mercadoPagoConnectedAt: true,
          applicationFeePercent: true,
        },
      });

      if (!estabelecimento) {
        res.status(404).json({ error: 'Estabelecimento não encontrado' });
        return;
      }

      // Verificar se o token ainda é válido (se conectado)
      let tokenValid = false;
      if (estabelecimento.mercadoPagoConnected && estabelecimento.mercadoPagoCollectorId) {
        try {
          const estabelecimentoFull = await prisma.estabelecimento.findUnique({
            where: { id: estabelecimento.id },
          });

          if (estabelecimentoFull?.mercadoPagoAccessToken) {
            const { accessToken } = MarketplaceOAuthService.decryptTokensFromStorage(
              estabelecimentoFull.mercadoPagoAccessToken,
              estabelecimentoFull.mercadoPagoRefreshToken || ''
            );
            tokenValid = await MarketplaceOAuthService.validateToken(accessToken);
          }
        } catch (error) {
          console.error('Erro ao validar token:', error);
        }
      }

      res.json({
        estabelecimento: {
          id: estabelecimento.id,
          nome: estabelecimento.nome,
          mercadoPagoConnected: estabelecimento.mercadoPagoConnected,
          mercadoPagoCollectorId: estabelecimento.mercadoPagoCollectorId,
          mercadoPagoConnectedAt: estabelecimento.mercadoPagoConnectedAt,
          applicationFeePercent: estabelecimento.applicationFeePercent,
          tokenValid,
        },
      });
    } catch (error: any) {
      console.error('❌ Erro ao verificar status:', error);
      res.status(500).json({ error: 'Erro ao verificar status', details: error.message });
    }
  }

  /**
   * POST /marketplace/oauth/disconnect/:estabelecimentoId
   * Desconecta conta Mercado Pago do estabelecimento
   */
  static async disconnect(req: Request, res: Response): Promise<void> {
    try {
      const { estabelecimentoId } = req.params;
      const user = (req as any).user;

      if (!user || user.role !== 'dono') {
        res.status(403).json({ error: 'Apenas donos podem desconectar contas' });
        return;
      }

      const estabelecimento = await prisma.estabelecimento.findFirst({
        where: {
          id: Number(estabelecimentoId),
          donoId: user.id,
        },
      });

      if (!estabelecimento) {
        res.status(404).json({ error: 'Estabelecimento não encontrado' });
        return;
      }

      // Limpar dados de conexão
      await prisma.estabelecimento.update({
        where: { id: Number(estabelecimentoId) },
        data: {
          mercadoPagoConnected: false,
          mercadoPagoCollectorId: null,
          mercadoPagoAccessToken: null,
          mercadoPagoRefreshToken: null,
          mercadoPagoConnectedAt: null,
        },
      });

      res.json({
        success: true,
        message: 'Conta Mercado Pago desconectada com sucesso',
      });
    } catch (error: any) {
      console.error('❌ Erro ao desconectar:', error);
      res.status(500).json({ error: 'Erro ao desconectar conta', details: error.message });
    }
  }

  /**
   * POST /marketplace/oauth/refresh/:estabelecimentoId
   * Renova access token usando refresh token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { estabelecimentoId } = req.params;
      const user = (req as any).user;

      if (!user || user.role !== 'dono') {
        res.status(403).json({ error: 'Apenas donos podem renovar tokens' });
        return;
      }

      const estabelecimento = await prisma.estabelecimento.findFirst({
        where: {
          id: Number(estabelecimentoId),
          donoId: user.id,
        },
      });

      if (!estabelecimento) {
        res.status(404).json({ error: 'Estabelecimento não encontrado' });
        return;
      }

      if (!estabelecimento.mercadoPagoRefreshToken) {
        res.status(400).json({ error: 'Nenhum refresh token disponível' });
        return;
      }

      // Descriptografar refresh token
      const { refreshToken } = MarketplaceOAuthService.decryptTokensFromStorage(
        estabelecimento.mercadoPagoAccessToken || '',
        estabelecimento.mercadoPagoRefreshToken
      );

      // Renovar token
      const newTokens = await MarketplaceOAuthService.refreshAccessToken(refreshToken);

      // Criptografar e salvar novos tokens
      const { encryptedAccessToken, encryptedRefreshToken } =
        MarketplaceOAuthService.prepareTokensForStorage(
          newTokens.access_token,
          newTokens.refresh_token
        );

      await prisma.estabelecimento.update({
        where: { id: Number(estabelecimentoId) },
        data: {
          mercadoPagoAccessToken: encryptedAccessToken,
          mercadoPagoRefreshToken: encryptedRefreshToken,
        },
      });

      res.json({
        success: true,
        message: 'Token renovado com sucesso',
      });
    } catch (error: any) {
      console.error('❌ Erro ao renovar token:', error);
      res.status(500).json({ error: 'Erro ao renovar token', details: error.message });
    }
  }
}


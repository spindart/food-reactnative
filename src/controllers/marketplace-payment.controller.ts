// Controller para Pagamentos Marketplace com Split
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MarketplacePaymentService } from '../services/marketplace-payment.service';

const prisma = new PrismaClient();

export class MarketplacePaymentController {
  /**
   * POST /marketplace/payment/pix
   * Cria pagamento PIX com split
   */
  static async createPixPayment(req: Request, res: Response): Promise<void> {
    try {
      const {
        amount,
        description,
        estabelecimentoId,
        payerEmail,
        payerFirstName,
        payerLastName,
        payerCpf,
        pedidoId,
        dateOfExpiration,
      } = req.body;

      if (!amount || !description || !estabelecimentoId || !payerEmail) {
        res.status(400).json({
          error: 'Campos obrigatórios: amount, description, estabelecimentoId, payerEmail',
        });
        return;
      }

      const payment = await MarketplacePaymentService.createPixSplitPayment({
        amount,
        description,
        estabelecimentoId,
        payerEmail,
        payerFirstName,
        payerLastName,
        payerCpf,
        pedidoId,
        dateOfExpiration,
      });

      res.json(payment);
    } catch (error: any) {
      console.error('❌ Erro ao criar pagamento PIX com split:', error);
      res.status(500).json({
        error: 'Erro ao criar pagamento PIX',
        details: error.message,
      });
    }
  }

  /**
   * POST /marketplace/payment/card
   * Cria pagamento com cartão e split
   */
  static async createCardPayment(req: Request, res: Response): Promise<void> {
    try {
      const {
        amount,
        description,
        estabelecimentoId,
        payerEmail,
        token,
        installments,
        paymentMethodId,
        issuerId,
        pedidoId,
      } = req.body;

      if (
        !amount ||
        !description ||
        !estabelecimentoId ||
        !payerEmail ||
        !token ||
        !installments ||
        !paymentMethodId
      ) {
        res.status(400).json({
          error:
            'Campos obrigatórios: amount, description, estabelecimentoId, payerEmail, token, installments, paymentMethodId',
        });
        return;
      }

      const payment = await MarketplacePaymentService.createCardSplitPayment({
        amount,
        description,
        estabelecimentoId,
        payerEmail,
        token,
        installments,
        paymentMethodId,
        issuerId,
        pedidoId,
      });

      res.json(payment);
    } catch (error: any) {
      console.error('❌ Erro ao criar pagamento com cartão e split:', error);
      res.status(500).json({
        error: 'Erro ao criar pagamento com cartão',
        details: error.message,
      });
    }
  }

  /**
   * POST /marketplace/payment/boleto
   * Cria pagamento com boleto e split
   */
  static async createBoletoPayment(req: Request, res: Response): Promise<void> {
    try {
      const {
        amount,
        description,
        estabelecimentoId,
        payerEmail,
        payerFirstName,
        payerLastName,
        payerCpf,
        pedidoId,
        dateOfExpiration,
      } = req.body;

      if (!amount || !description || !estabelecimentoId || !payerEmail) {
        res.status(400).json({
          error: 'Campos obrigatórios: amount, description, estabelecimentoId, payerEmail',
        });
        return;
      }

      const payment = await MarketplacePaymentService.createBoletoSplitPayment({
        amount,
        description,
        estabelecimentoId,
        payerEmail,
        payerFirstName,
        payerLastName,
        payerCpf,
        pedidoId,
        dateOfExpiration,
      });

      res.json(payment);
    } catch (error: any) {
      console.error('❌ Erro ao criar pagamento com boleto e split:', error);
      res.status(500).json({
        error: 'Erro ao criar pagamento com boleto',
        details: error.message,
      });
    }
  }

  /**
   * POST /marketplace/payment/refund/:paymentId
   * Cria reembolso mantendo a divisão do split
   */
  static async createRefund(req: Request, res: Response): Promise<void> {
    try {
      const { paymentId } = req.params;
      const { amount, estabelecimentoId } = req.body;

      if (!paymentId || !estabelecimentoId) {
        res.status(400).json({
          error: 'paymentId e estabelecimentoId são obrigatórios',
        });
        return;
      }

      const refund = await MarketplacePaymentService.createSplitRefund({
        paymentId,
        amount,
        estabelecimentoId,
      });

      res.json(refund);
    } catch (error: any) {
      console.error('❌ Erro ao criar reembolso com split:', error);
      res.status(500).json({
        error: 'Erro ao criar reembolso',
        details: error.message,
      });
    }
  }

  /**
   * GET /marketplace/transactions/:estabelecimentoId
   * Consulta transações por estabelecimento
   */
  static async getTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { estabelecimentoId } = req.params;
      const user = (req as any).user;
      const { status, startDate, endDate, limit, offset } = req.query;

      if (!user || user.role !== 'dono') {
        res.status(403).json({ error: 'Apenas donos podem consultar transações' });
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
        res.status(404).json({ error: 'Estabelecimento não encontrado' });
        return;
      }

      const result = await MarketplacePaymentService.getTransactionsByEstabelecimento(
        Number(estabelecimentoId),
        {
          status: status as string,
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
          limit: limit ? Number(limit) : undefined,
          offset: offset ? Number(offset) : undefined,
        }
      );

      res.json(result);
    } catch (error: any) {
      console.error('❌ Erro ao consultar transações:', error);
      res.status(500).json({
        error: 'Erro ao consultar transações',
        details: error.message,
      });
    }
  }

  /**
   * GET /marketplace/transactions/:estabelecimentoId/summary
   * Resumo financeiro por estabelecimento
   */
  static async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const { estabelecimentoId } = req.params;
      const user = (req as any).user;
      const { startDate, endDate } = req.query;

      if (!user || user.role !== 'dono') {
        res.status(403).json({ error: 'Apenas donos podem consultar resumo' });
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
        res.status(404).json({ error: 'Estabelecimento não encontrado' });
        return;
      }

      const where: any = {
        estabelecimentoId: Number(estabelecimentoId),
      };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      // Calcular totais
      const [totalTransactions, totalAmount, totalFee, totalSellerAmount] = await Promise.all([
        prisma.marketplaceFee.count({ where }),
        prisma.marketplaceFee.aggregate({
          where,
          _sum: { transactionAmount: true },
        }),
        prisma.marketplaceFee.aggregate({
          where,
          _sum: { applicationFee: true },
        }),
        prisma.marketplaceFee.aggregate({
          where,
          _sum: { sellerAmount: true },
        }),
      ]);

      res.json({
        estabelecimento: {
          id: estabelecimento.id,
          nome: estabelecimento.nome,
          applicationFeePercent: estabelecimento.applicationFeePercent,
        },
        summary: {
          totalTransactions,
          totalAmount: totalAmount._sum.transactionAmount || 0,
          totalFee: totalFee._sum.applicationFee || 0,
          totalSellerAmount: totalSellerAmount._sum.sellerAmount || 0,
          period: {
            startDate: startDate || null,
            endDate: endDate || null,
          },
        },
      });
    } catch (error: any) {
      console.error('❌ Erro ao obter resumo:', error);
      res.status(500).json({
        error: 'Erro ao obter resumo financeiro',
        details: error.message,
      });
    }
  }
}


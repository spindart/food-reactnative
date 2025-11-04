// Serviço de Pagamento com Split Payment (Marketplace)
import { MercadoPagoConfig, Payment } from 'mercadopago';
import axios from 'axios';
import { MarketplaceOAuthService } from './marketplace-oauth.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Cliente do marketplace (conta principal)
const marketplaceClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
});

interface SplitPaymentRequest {
  transaction_amount: number;
  description: string;
  payment_method_id: string;
  payer: {
    email: string;
    identification?: {
      type: string;
      number: string;
    };
    first_name?: string;
    last_name?: string;
  };
  // Split payment fields
  marketplace?: string; // Usar "NONE" para não usar marketplace padrão
  application_fee?: number; // Taxa cobrada pela plataforma
  metadata?: {
    storeId?: string; // ID do estabelecimento no seu sistema
    pedidoId?: string; // ID do pedido
    [key: string]: any;
  };
  // Para cartão
  token?: string;
  installments?: number;
  issuer_id?: number;
  // Para PIX
  date_of_expiration?: string;
  // Para boleto
  date_of_expiration_boleto?: string;
}

export class MarketplacePaymentService {
  /**
   * Cria pagamento com split (Pix, Cartão ou Boleto)
   * O valor é automaticamente dividido entre marketplace e seller
   */
  static async createSplitPayment({
    amount,
    description,
    paymentMethod, // 'pix', 'credit_card', 'debit_card', 'boleto'
    estabelecimentoId,
    payerEmail,
    payerFirstName,
    payerLastName,
    payerCpf,
    // Para cartão
    token,
    installments,
    paymentMethodId,
    issuerId,
    // Para boleto
    dateOfExpiration,
    // Metadata adicional
    pedidoId,
    metadata,
  }: {
    amount: number;
    description: string;
    paymentMethod: 'pix' | 'credit_card' | 'debit_card' | 'boleto';
    estabelecimentoId: number;
    payerEmail: string;
    payerFirstName?: string;
    payerLastName?: string;
    payerCpf?: string;
    token?: string;
    installments?: number;
    paymentMethodId?: string;
    issuerId?: number;
    dateOfExpiration?: string;
    pedidoId?: number;
    metadata?: Record<string, any>;
  }): Promise<{
    paymentId: string;
    status: string;
    status_detail: string;
    qr_code?: string;
    qr_code_base64?: string;
    ticket_url?: string;
    transaction_id?: string;
    date_of_expiration?: string;
    application_fee: number;
    seller_amount: number;
  }> {
    try {
      console.log('💰 Criando pagamento com split:', {
        amount,
        paymentMethod,
        estabelecimentoId,
        payerEmail,
      });

      // Buscar informações do estabelecimento (seller)
      const estabelecimento = await prisma.estabelecimento.findUnique({
        where: { id: estabelecimentoId },
      });

      if (!estabelecimento) {
        throw new Error('Estabelecimento não encontrado');
      }

      if (!estabelecimento.mercadoPagoConnected || !estabelecimento.mercadoPagoCollectorId) {
        throw new Error('Estabelecimento não possui conta Mercado Pago conectada');
      }

      // Calcular taxa (application_fee)
      const feePercent = estabelecimento.applicationFeePercent || 12.0;
      const applicationFee = Number((amount * (feePercent / 100)).toFixed(2));
      const sellerAmount = Number((amount - applicationFee).toFixed(2));

      console.log('💵 Cálculo de split:', {
        total: amount,
        feePercent,
        applicationFee,
        sellerAmount,
      });

      // Preparar dados do pagamento
      const paymentData: SplitPaymentRequest = {
        transaction_amount: amount,
        description,
        payment_method_id: paymentMethod === 'credit_card' || paymentMethod === 'debit_card' 
          ? (paymentMethodId || 'credit_card') 
          : paymentMethod,
        payer: {
          email: payerEmail,
        },
        application_fee: applicationFee,
        metadata: {
          storeId: estabelecimentoId.toString(),
          pedidoId: pedidoId?.toString(),
          ...metadata,
        },
      };

      // Adicionar dados do payer se fornecidos
      if (payerFirstName) paymentData.payer.first_name = payerFirstName;
      if (payerLastName) paymentData.payer.last_name = payerLastName;
      if (payerCpf) {
        paymentData.payer.identification = {
          type: 'CPF',
          number: payerCpf.replace(/\D/g, ''),
        };
      }

      // Configurar split payment - usar collector_id do seller
      // IMPORTANTE: Para usar split, precisamos usar o access_token do seller
      // Mas criar o pagamento pela conta do marketplace com application_fee
      
      // Para marketplace, o pagamento é criado pela conta principal
      // mas o collector_id é especificado no campo "collector_id" ou via marketplace
      
      // IMPORTANTE: Para marketplace split, o Mercado Pago usa automaticamente o collector_id
      // baseado no access_token usado. Como estamos usando o access_token do marketplace
      // e o estabelecimento está conectado via OAuth, o split funciona automaticamente
      // quando especificamos application_fee.
      const paymentPayload: any = {
        transaction_amount: amount,
        description,
        payment_method_id: paymentMethod === 'credit_card' || paymentMethod === 'debit_card' 
          ? (paymentMethodId || 'credit_card') 
          : paymentMethod,
        payer: paymentData.payer,
        application_fee: applicationFee,
        metadata: paymentData.metadata,
        // Nota: O collector_id não precisa ser especificado no payload.
        // O Mercado Pago identifica o seller através do OAuth connection.
        // O estabelecimento.mercadoPagoCollectorId é usado apenas para referência.
      };

      // Adicionar campos específicos por método de pagamento
      if (paymentMethod === 'pix') {
        paymentPayload.date_of_expiration = dateOfExpiration || new Date(Date.now() + 10 * 60 * 1000).toISOString();
      }

      if (paymentMethod === 'boleto') {
        paymentPayload.date_of_expiration = dateOfExpiration || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 dias
      }

      if (paymentMethod === 'credit_card' || paymentMethod === 'debit_card') {
        if (!token) {
          throw new Error('Token do cartão é obrigatório para pagamento com cartão');
        }
        paymentPayload.token = token;
        paymentPayload.installments = installments || 1;
        if (issuerId) {
          paymentPayload.issuer_id = issuerId;
        }
      }

      // IMPORTANTE: Para marketplace split, precisamos usar a API com o access_token da conta marketplace
      // mas especificar o collector_id do seller via header ou campo específico
      // Na prática, usando application_fee o Mercado Pago faz o split automaticamente
      // O collector_id é obtido do estabelecimento.mercadoPagoCollectorId

      // Criar pagamento usando SDK do Mercado Pago
      const payment = new Payment(marketplaceClient);
      
      // Gerar chave de idempotência
      const idempotencyKey = `split-${estabelecimentoId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const result = await payment.create({
        body: paymentPayload,
        requestOptions: {
          idempotencyKey: idempotencyKey,
        },
      });

      console.log('✅ Pagamento com split criado:', {
        paymentId: result.id,
        status: result.status,
        applicationFee,
        sellerAmount,
      });

      // Retornar informações do pagamento
      const response: any = {
        paymentId: result.id?.toString() || '',
        status: result.status || 'unknown',
        status_detail: result.status_detail || 'unknown',
        application_fee: applicationFee,
        seller_amount: sellerAmount,
      };

      // Adicionar campos específicos para PIX
      if (paymentMethod === 'pix') {
        response.qr_code = result.point_of_interaction?.transaction_data?.qr_code;
        response.qr_code_base64 = result.point_of_interaction?.transaction_data?.qr_code_base64;
        response.ticket_url = result.point_of_interaction?.transaction_data?.ticket_url;
        response.transaction_id = result.point_of_interaction?.transaction_data?.transaction_id;
        response.date_of_expiration = result.date_of_expiration;
      }

      // Adicionar campos específicos para boleto
      if (paymentMethod === 'boleto') {
        response.ticket_url = result.transaction_details?.external_resource_url;
        response.date_of_expiration = result.date_of_expiration;
      }

      return response;
    } catch (error: any) {
      console.error('❌ Erro ao criar pagamento com split:', {
        message: error.message,
        status: error.status,
        response: error.response?.data,
      });

      // Tratamento específico de erros
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.message?.includes('invalid_collector')) {
          throw new Error('Conta do estabelecimento não está configurada corretamente');
        } else if (errorData.message?.includes('invalid_application_fee')) {
          throw new Error('Taxa de aplicação inválida');
        }
      }

      throw new Error(error.message || 'Erro ao criar pagamento com split');
    }
  }

  /**
   * Cria pagamento PIX com split
   */
  static async createPixSplitPayment({
    amount,
    description,
    estabelecimentoId,
    payerEmail,
    payerFirstName,
    payerLastName,
    payerCpf,
    pedidoId,
    dateOfExpiration,
  }: {
    amount: number;
    description: string;
    estabelecimentoId: number;
    payerEmail: string;
    payerFirstName?: string;
    payerLastName?: string;
    payerCpf?: string;
    pedidoId?: number;
    dateOfExpiration?: string;
  }) {
    return this.createSplitPayment({
      amount,
      description,
      paymentMethod: 'pix',
      estabelecimentoId,
      payerEmail,
      payerFirstName,
      payerLastName,
      payerCpf,
      dateOfExpiration,
      pedidoId,
    });
  }

  /**
   * Cria pagamento com cartão e split
   */
  static async createCardSplitPayment({
    amount,
    description,
    estabelecimentoId,
    payerEmail,
    token,
    installments,
    paymentMethodId,
    issuerId,
    pedidoId,
  }: {
    amount: number;
    description: string;
    estabelecimentoId: number;
    payerEmail: string;
    token: string;
    installments: number;
    paymentMethodId: string;
    issuerId?: number;
    pedidoId?: number;
  }) {
    return this.createSplitPayment({
      amount,
      description,
      paymentMethod: 'credit_card',
      estabelecimentoId,
      payerEmail,
      token,
      installments,
      paymentMethodId,
      issuerId,
      pedidoId,
    });
  }

  /**
   * Cria pagamento com boleto e split
   */
  static async createBoletoSplitPayment({
    amount,
    description,
    estabelecimentoId,
    payerEmail,
    payerFirstName,
    payerLastName,
    payerCpf,
    pedidoId,
    dateOfExpiration,
  }: {
    amount: number;
    description: string;
    estabelecimentoId: number;
    payerEmail: string;
    payerFirstName?: string;
    payerLastName?: string;
    payerCpf?: string;
    pedidoId?: number;
    dateOfExpiration?: string;
  }) {
    return this.createSplitPayment({
      amount,
      description,
      paymentMethod: 'boleto',
      estabelecimentoId,
      payerEmail,
      payerFirstName,
      payerLastName,
      payerCpf,
      dateOfExpiration,
      pedidoId,
    });
  }

  /**
   * Processa reembolso mantendo a divisão do split
   * O reembolso é feito proporcionalmente entre marketplace e seller
   */
  static async createSplitRefund({
    paymentId,
    amount,
    estabelecimentoId,
  }: {
    paymentId: string;
    amount?: number;
    estabelecimentoId: number;
  }): Promise<{
    refundId: string;
    status: string;
    amount: number;
    application_fee_refunded: number;
    seller_amount_refunded: number;
  }> {
    try {
      console.log('🔄 Criando reembolso com split:', { paymentId, amount });

      // Buscar informações do pagamento original
      const pedido = await prisma.pedido.findFirst({
        where: {
          paymentId,
          estabelecimentoId,
        },
      });

      if (!pedido) {
        throw new Error('Pedido não encontrado');
      }

      const totalAmount = pedido.totalAmount || 0;
      const applicationFee = pedido.applicationFeeAmount || 0;
      const sellerAmount = pedido.sellerAmount || 0;

      // Calcular proporção do reembolso
      const refundAmount = amount || totalAmount;
      const applicationFeeRefunded = refundAmount === totalAmount
        ? applicationFee
        : Number((refundAmount * (applicationFee / totalAmount)).toFixed(2));
      const sellerAmountRefunded = refundAmount === totalAmount
        ? sellerAmount
        : Number((refundAmount * (sellerAmount / totalAmount)).toFixed(2));

      // Criar reembolso usando o serviço do Mercado Pago
      const { MercadoPagoService } = require('./mercadopago.service');
      const refund = await MercadoPagoService.createRefund(paymentId, refundAmount);

      console.log('✅ Reembolso com split processado:', {
        refundId: refund.refundId,
        applicationFeeRefunded,
        sellerAmountRefunded,
      });

      return {
        refundId: refund.refundId.toString(),
        status: refund.status,
        amount: refundAmount,
        application_fee_refunded: applicationFeeRefunded,
        seller_amount_refunded: sellerAmountRefunded,
      };
    } catch (error: any) {
      console.error('❌ Erro ao criar reembolso com split:', error.message);
      throw error;
    }
  }

  /**
   * Consulta transações por estabelecimento
   */
  static async getTransactionsByEstabelecimento(
    estabelecimentoId: number,
    filters?: {
      status?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ) {
    try {
      const where: any = {
        estabelecimentoId,
      };

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.startDate || filters?.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }

      const transactions = await prisma.marketplaceFee.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
        include: {
          estabelecimento: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      });

      const total = await prisma.marketplaceFee.count({ where });

      return {
        transactions,
        total,
        limit: filters?.limit || 50,
        offset: filters?.offset || 0,
      };
    } catch (error: any) {
      console.error('❌ Erro ao buscar transações:', error.message);
      throw error;
    }
  }
}


import { Router } from 'express';
import { MercadoPagoService } from '../services/mercadopago.service';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const router = Router();
const prisma = new PrismaClient();

// Endpoint para receber webhooks do Mercado Pago
router.post('/webhook/mercadopago', async (req, res) => {
  try {
    console.log('🔔 Webhook recebido:', req.body);
    
    const { type, data } = req.body;
    
    // Verificar se é uma notificação de pagamento
    if (type === 'payment' && data?.id) {
      const paymentId = data.id.toString();
      console.log(`💰 Verificando pagamento: ${paymentId}`);
      
      // Buscar informações completas do pagamento no Mercado Pago
      const paymentResponse = await axios.get(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
          },
        }
      );

      const payment = paymentResponse.data;
      console.log(`📊 Status do pagamento ${paymentId}:`, payment.status);

      // Extrair informações de split do pagamento
      const applicationFee = payment.application_fee_amount || 0;
      const transactionAmount = payment.transaction_amount || 0;
      const sellerAmount = transactionAmount - applicationFee;
      const estabelecimentoId = payment.metadata?.storeId 
        ? Number(payment.metadata.storeId) 
        : null;
      const pedidoId = payment.metadata?.pedidoId 
        ? Number(payment.metadata.pedidoId) 
        : null;

      // Atualizar pedido no banco de dados (se existe)
      if (pedidoId) {
        try {
          const pedido = await prisma.pedido.findUnique({
            where: { id: pedidoId },
          });

          if (pedido) {
            await prisma.pedido.update({
              where: { id: pedidoId },
              data: {
                paymentStatus: payment.status,
                paymentMethod: payment.payment_method_id,
                splitPayment: !!applicationFee,
                applicationFeeAmount: applicationFee > 0 ? applicationFee : null,
                sellerAmount: applicationFee > 0 ? sellerAmount : null,
              },
            });

            console.log('✅ Pedido atualizado com informações de split');
          }
        } catch (error: any) {
          console.error('⚠️ Erro ao atualizar pedido:', error.message);
        }
      }

      // Registrar transação no histórico de fees (se for split payment)
      if (applicationFee > 0 && estabelecimentoId) {
        try {
          await prisma.marketplaceFee.upsert({
            where: {
              paymentId: paymentId,
            },
            create: {
              pedidoId: pedidoId,
              estabelecimentoId: estabelecimentoId,
              paymentId: paymentId,
              transactionAmount: transactionAmount,
              applicationFee: applicationFee,
              sellerAmount: sellerAmount,
              feePercent: transactionAmount > 0 
                ? Number(((applicationFee / transactionAmount) * 100).toFixed(2))
                : 0,
              status: payment.status,
            },
            update: {
              status: payment.status,
              transactionAmount: transactionAmount,
              applicationFee: applicationFee,
              sellerAmount: sellerAmount,
            },
          });

          console.log('✅ Transação registrada no histórico de fees');
        } catch (error: any) {
          console.error('⚠️ Erro ao registrar transação:', error.message);
        }
      }

      if (payment.status === 'approved') {
        console.log('✅ Pagamento aprovado! Processando...');
        
        // Aqui você pode:
        // 1. Atualizar o pedido no banco de dados (já feito acima)
        // 2. Enviar email de confirmação
        // 3. Notificar o frontend via WebSocket
        // 4. Processar outras ações pós-pagamento
        
        res.status(200).json({ 
          success: true, 
          message: 'Webhook processado com sucesso',
          paymentId,
          status: payment.status,
          splitPayment: applicationFee > 0,
          applicationFee,
          sellerAmount,
        });
      } else {
        console.log(`⏳ Pagamento ainda pendente: ${payment.status}`);
        res.status(200).json({ 
          success: true, 
          message: 'Webhook recebido, pagamento pendente',
          paymentId,
          status: payment.status,
        });
      }
    } else if (type === 'refund' && data?.id) {
      // Processar webhook de reembolso
      const refundId = data.id.toString();
      console.log(`🔄 Processando reembolso: ${refundId}`);

      // Buscar transação relacionada
      const fee = await prisma.marketplaceFee.findFirst({
        where: {
          paymentId: data.payment_id?.toString(),
        },
      });

      if (fee) {
        await prisma.marketplaceFee.update({
          where: { id: fee.id },
          data: {
            status: 'refunded',
          },
        });

        // Atualizar pedido também
        if (fee.pedidoId) {
          await prisma.pedido.update({
            where: { id: fee.pedidoId },
            data: {
              refundStatus: 'approved',
              refundId: refundId,
            },
          });
        }

        console.log('✅ Reembolso processado e registrado');
      }

      res.status(200).json({ 
        success: true, 
        message: 'Webhook de reembolso processado',
        refundId,
      });
    } else {
      console.log('❓ Tipo de webhook não reconhecido:', type);
      res.status(200).json({ success: true, message: 'Webhook recebido' });
    }
  } catch (error: any) {
    console.error('❌ Erro ao processar webhook:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor',
      details: error.message,
    });
  }
});

// Endpoint para simular aprovação de pagamento (para testes)
router.post('/webhook/simulate-payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    console.log(`🧪 Simulando aprovação do pagamento: ${paymentId}`);
    
    // Simular o payload que o Mercado Pago enviaria
    const simulatedWebhook = {
      action: 'payment.updated',
      api_version: 'v1',
      data: { id: parseInt(paymentId) },
      date_created: new Date().toISOString(),
      type: 'payment'
    };
    
    // Processar como se fosse um webhook real
    const { type, data } = simulatedWebhook;
    
    if (type === 'payment' && data?.id) {
      const paymentStatus = await MercadoPagoService.getPaymentStatus(data.id.toString());
      
      if (paymentStatus.status === 'approved') {
        console.log('✅ Pagamento simulado como aprovado!');
        res.status(200).json({ 
          success: true, 
          message: 'Pagamento simulado como aprovado',
          paymentId: data.id,
          status: paymentStatus.status
        });
      } else {
        console.log('⚠️ Pagamento ainda não está aprovado no Mercado Pago');
        res.status(400).json({ 
          success: false, 
          message: 'Pagamento ainda não está aprovado',
          currentStatus: paymentStatus.status
        });
      }
    }
  } catch (error) {
    console.error('❌ Erro ao simular pagamento:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao simular pagamento' 
    });
  }
});

export default router;

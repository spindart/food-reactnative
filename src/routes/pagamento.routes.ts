import { Router } from 'express';
import { MercadoPagoService } from '../services/mercadopago.service';

const router = Router();

// POST /pagamento/pix
router.post('/pix', async function(req, res) {
  const { amount, description, payerEmail, pedidoId, payerFirstName, payerLastName, payerCpf, payerAddress } = req.body;
  
  console.log('Recebido /pagamento/pix:', { amount, description, payerEmail, pedidoId, payerFirstName, payerLastName, payerCpf });
  
  if (!amount || !description || !payerEmail) {
    return res.status(400).json({ error: 'amount, description e payerEmail são obrigatórios' });
  }
  
  try {
    const pix = await MercadoPagoService.createPixPayment({ 
      amount, 
      description, 
      payerEmail,
      payerFirstName,
      payerLastName,
      payerCpf,
      payerAddress
    });
    
    // Pedido será criado após pagamento aprovado no frontend
    // Não salvar informações de pagamento aqui pois o pedido ainda não existe
    
    return res.status(200).json(pix);
  } catch (error: any) {
    console.error('❌ Erro no endpoint PIX:', error);
    console.error('❌ Stack trace:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      status: error.status,
      response: error.response?.data
    });
    
    return res.status(500).json({ 
      error: error.message || 'Erro interno do servidor',
      details: error.message.includes('forbidden') ? 'Email do pagador não autorizado. Verifique as credenciais do MercadoPago.' : error.message
    });
  }
});


// POST /pagamento/cartao
router.post('/cartao', async function(req, res) {
  console.log('Recebido /pagamento/cartao:', req.body);
    const { amount, description, payerEmail, token, installments, paymentMethodId, issuerId, cardNumber, usarCartaoSalvo, cartaoId, securityCode, pedidoId } = req.body;
  
  if (!amount || !description || !payerEmail || !token || !installments || !paymentMethodId) {
    return res.status(400).json({ error: 'amount, description, payerEmail, token, installments e paymentMethodId são obrigatórios' });
  }
  
  try {
    let payment;
    
    if (usarCartaoSalvo && cartaoId) {
      // Pagamento com cartão salvo - usando método oficial do MercadoPago
      console.log('💳 Processando pagamento com cartão salvo:', cartaoId);
      
      // Buscar dados do cartão no banco para obter customerId
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const cartao = await prisma.cartao.findUnique({
        where: { id: parseInt(cartaoId) },
        include: { usuario: true }
      });
      
      if (!cartao || !cartao.usuario.mercadoPagoCustomerId) {
        throw new Error('Cartão salvo não encontrado ou usuário sem customer ID');
      }
      
      payment = await MercadoPagoService.createPaymentWithSavedCard({
        amount,
        description,
        payerEmail,
        customerId: cartao.usuario.mercadoPagoCustomerId,
        cardId: cartao.mercadoPagoCardId, // ID do cartão salvo no MercadoPago
        securityCode: securityCode, // CVV fornecido pelo usuário
        installments,
        paymentMethodId: paymentMethodId
      });
      
      await prisma.$disconnect();
    } else {
      // Pagamento com cartão novo
      console.log('💳 Processando pagamento com cartão novo');
      
      // Sempre detectar bandeira no backend para garantir precisão
      let finalPaymentMethodId = paymentMethodId;
      if (cardNumber) {
        const detectedBrand = MercadoPagoService.detectCardBrand(cardNumber);
        finalPaymentMethodId = detectedBrand;
        console.log('Bandeira detectada no backend:', detectedBrand, 'para cartão:', cardNumber.substring(0, 6) + '****');
      }
      
      payment = await MercadoPagoService.createCardPayment({ 
        amount, 
        description, 
        payerEmail, 
        token, 
        installments, 
        paymentMethodId: finalPaymentMethodId, 
        issuerId 
      });
    }
    
    // Pedido será criado após pagamento aprovado no frontend
    // Não salvar informações de pagamento aqui pois o pedido ainda não existe
    
    return res.status(200).json(payment);
  } catch (error: any) {
    console.error('Erro no endpoint Cartão:', error);
    return res.status(500).json({ 
      error: error.message,
      details: error.message.includes('forbidden') ? 'Email do pagador não autorizado. Verifique as credenciais do MercadoPago.' : 
              error.message.includes('bin_not_found') ? 'Bandeira do cartão não reconhecida. Tente outro cartão.' : error.message
    });
  }
});

// POST /pagamento/gerar-token-cartao
router.post('/gerar-token-cartao', async function(req, res) {
  const { cardNumber, cardExp, cardCvv, cardName } = req.body;
  
  console.log('Recebido /pagamento/gerar-token-cartao:', { cardNumber: cardNumber?.substring(0, 4) + '****', cardExp, cardName });
  
  if (!cardNumber || !cardExp || !cardCvv || !cardName) {
    return res.status(400).json({ error: 'cardNumber, cardExp, cardCvv e cardName são obrigatórios' });
  }
  
  try {
    const token = await MercadoPagoService.generateCardToken({ cardNumber, cardExp, cardCvv, cardName });
    return res.status(200).json({ token });
  } catch (error: any) {
    console.error('Erro ao gerar token do cartão:', error);
    return res.status(500).json({ 
      error: error.message,
      details: 'Erro ao gerar token do cartão. Verifique os dados do cartão.'
    });
  }
});

router.post('/gerar-token-cartao-salvo', async function(req, res) {
  console.log('Recebido /pagamento/gerar-token-cartao-salvo:', req.body);
  const { cardId, securityCode } = req.body;
  
  if (!cardId || !securityCode) {
    return res.status(400).json({ error: 'cardId e securityCode são obrigatórios' });
  }
  
  try {
    const token = await MercadoPagoService.generateSavedCardToken({ cardId, securityCode });
    return res.status(200).json({ token });
  } catch (error: any) {
    console.error('Erro no endpoint gerar-token-cartao-salvo:', error);
    return res.status(500).json({ 
      error: error.message,
      details: error.message.includes('invalid') ? 'CVV inválido. Verifique o código de segurança.' : error.message
    });
  }
});

// GET /pagamento/mercadopago/status/:id
router.get('/mercadopago/status/:id', async function(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'paymentId obrigatório' });
  try {
    const status = await MercadoPagoService.getPaymentStatus(id);
    return res.status(200).json(status);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;

// Script de teste para verificar o salvamento de cartões
const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function testCardSaving() {
  console.log('🧪 Testando salvamento de cartão após pagamento...');
  
  try {
    // 1. Simular pagamento com cartão novo
    const paymentData = {
      amount: 50.00,
      description: 'Teste de pagamento com cartão',
      payerEmail: 'teste@exemplo.com',
      token: 'test-token-123',
      installments: 1,
      paymentMethodId: 'visa',
      cardNumber: '4111111111111111',
      cardExp: '12/25',
      cardName: 'João Silva',
      cardCvv: '123'
    };
    
    console.log('📤 Enviando dados de pagamento:', {
      ...paymentData,
      token: 'test-token-***',
      cardNumber: '4111****1111'
    });
    
    const response = await axios.post(`${API_BASE}/pagamento/cartao`, paymentData);
    
    console.log('✅ Resposta do pagamento:', response.data);
    
    // 2. Verificar se o cartão foi salvo
    console.log('🔍 Verificando se o cartão foi salvo...');
    
    // Simular busca de cartões do usuário
    const userCardsResponse = await axios.get(`${API_BASE}/cartoes/1`); // Assumindo usuário ID 1
    
    console.log('📱 Cartões do usuário:', userCardsResponse.data);
    
    if (userCardsResponse.data.length > 0) {
      console.log('✅ Cartão salvo com sucesso!');
      console.log('📋 Detalhes do cartão:', userCardsResponse.data[0]);
    } else {
      console.log('❌ Cartão não foi salvo');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
  }
}

// Executar teste
testCardSaving();


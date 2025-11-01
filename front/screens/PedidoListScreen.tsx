import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, ActivityIndicator, TouchableOpacity, Modal, ScrollView, Image, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { updateOrderStatus } from '../services/orderService';
import { getCurrentUser } from '../services/currentUserService';
import { useFocusEffect } from '@react-navigation/native';
import AvaliacaoModal from './AvaliacaoModal';
import { avaliacaoService } from '../services/avaliacaoService';
import { Alert } from 'react-native';

type Pedido = {
  id: string;
  clienteId: string;
  estabelecimentoId: string;
  status: string;
  createdAt: string;
  itens?: any[];
  formaPagamento?: string;
  estabelecimento?: { nome: string; imagem?: string };
  total?: number;
  formaPagamentoEntrega?: string;
  precisaTroco?: boolean;
  trocoParaQuanto?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  enderecoEntrega?: string;
  taxaEntrega?: number;
};

const PedidoListScreen: React.FC = () => {
  const navigation = useNavigation();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pedidoAvaliado, setPedidoAvaliado] = useState<boolean>(false);
  const [avaliacaoModalVisible, setAvaliacaoModalVisible] = useState(false);
  const [pedidoParaAvaliar, setPedidoParaAvaliar] = useState<Pedido | null>(null);

  const fetchPedidos = async (isRefresh: boolean = false) => {
    try {
      console.log('🔄 Iniciando busca de pedidos...');
      if (!isRefresh) {
        setLoading(true);
      }
      setError(null);
      
      const user = await getCurrentUser();
      console.log('👤 Usuário atual:', user);
      
      if (!user?.id) {
        console.log('❌ Usuário não autenticado');
        setError('Usuário não autenticado.');
        setLoading(false);
        return;
      }
      
      console.log('📡 Fazendo requisição para API...');
      console.log('🔗 URL:', `/pedidos/cliente/${user.id}`);
      
      const response = await api.get(`/pedidos/cliente/${user.id}`);
      console.log('✅ Resposta recebida:', response.status);
      console.log('📊 Dados dos pedidos:', JSON.stringify(response.data, null, 2));
      
      const pedidosAtuais = response.data.filter((p: any) => p.status !== 'entregue' && p.status !== 'cancelado');
      const pedidosHistorico = response.data.filter((p: any) => p.status === 'entregue' || p.status === 'cancelado');
      
      console.log('📋 Pedidos atuais:', pedidosAtuais.length);
      console.log('📋 Pedidos históricos:', pedidosHistorico.length);
      
      setPedidos([...pedidosAtuais, ...pedidosHistorico]);
      console.log('✅ Pedidos carregados com sucesso');
      
    } catch (err: any) {
      console.error('❌ Erro ao carregar pedidos:', err);
      console.error('❌ Status:', err.response?.status);
      console.error('❌ Data:', err.response?.data);
      console.error('❌ Message:', err.message);
      
      let errorMessage = 'Erro ao carregar os pedidos.';
      
      if (err.response?.status === 401) {
        errorMessage = 'Sessão expirada. Faça login novamente.';
      } else if (err.response?.status === 404) {
        errorMessage = 'Nenhum pedido encontrado.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPedidos(true);
  };

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      fetchPedidos();
      
      // Verificar se há pedidos para avaliar
      verificarPedidosParaAvaliar();
    }, [])
  );

  const verificarPedidosParaAvaliar = async () => {
    try {
      const pedidosParaAvaliar = await avaliacaoService.listarParaAvaliar();
      if (pedidosParaAvaliar.pedidos && pedidosParaAvaliar.pedidos.length > 0) {
        // Encontrar o pedido na lista local
        const pedidoEncontrado = pedidosParaAvaliar.pedidos[0];
        
        // Verificar se pode avaliar antes de mostrar o modal
        try {
          const podeAvaliar = await avaliacaoService.podeAvaliar(pedidoEncontrado.id);
          
          if (podeAvaliar.canAvaliar && podeAvaliar.isWithinWindow) {
            const pedidoCompleto = await api.get(`/pedidos/${pedidoEncontrado.id}`);
            
            if (pedidoCompleto.data) {
              setPedidoParaAvaliar(pedidoCompleto.data);
              // Mostrar modal após 2 segundos (para não ser muito invasivo)
              setTimeout(() => {
                setAvaliacaoModalVisible(true);
              }, 2000);
            }
          }
        } catch (error) {
          console.log('Erro ao verificar se pode avaliar:', error);
        }
      }
    } catch (error) {
      console.log('Nenhum pedido para avaliar no momento');
    }
  };

  const handleUpdateStatus = async (pedidoId: string) => {
    try {
      const updatedOrder = await updateOrderStatus(pedidoId);
      setPedidos((prevPedidos) =>
        prevPedidos.map((pedido) =>
          pedido.id === pedidoId ? { ...pedido, status: updatedOrder.status } : pedido
        )
      );
    } catch (error) {
      setError('Erro ao atualizar o status do pedido.');
    }
  };

  const statusMap: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
    pendente: { label: 'Pendente', color: '#ea1d2c', icon: 'time-outline' },
    preparo: { label: 'Em preparo', color: '#f7b731', icon: 'restaurant-outline' },
    em_entrega: { label: 'Saiu para entrega', color: '#2196f3', icon: 'car-outline' },
    entregue: { label: 'Entregue', color: '#2ecc71', icon: 'checkmark-circle-outline' },
    cancelado: { label: 'Cancelado', color: '#e74c3c', icon: 'close-circle-outline' },
  };

  const getPaymentIcon = (pedido: Pedido) => {
    if (pedido.formaPagamentoEntrega) {
      return pedido.formaPagamentoEntrega === 'dinheiro' ? 'cash-outline' : 'card-outline';
    }
    if (pedido.formaPagamento === 'pix' || pedido.paymentMethod === 'pix') return 'phone-portrait-outline';
    if (pedido.formaPagamento === 'cartao' || pedido.paymentMethod === 'credit_card') return 'card-outline';
    return 'card-outline';
  };

  const getPaymentText = (pedido: Pedido) => {
    if (pedido.formaPagamentoEntrega) {
      const method = pedido.formaPagamentoEntrega === 'dinheiro' 
        ? 'Dinheiro' 
        : pedido.formaPagamentoEntrega === 'debito' 
        ? 'Cartão de Débito' 
        : 'Cartão de Crédito';
      return `Pagar na entrega: ${method}${pedido.precisaTroco ? ` (Troco para R$ ${pedido.trocoParaQuanto?.toFixed(2)})` : ''}`;
    }
    if (pedido.formaPagamento === 'pix' || pedido.paymentMethod === 'pix') return 'PIX';
    if (pedido.formaPagamento === 'cartao' || pedido.paymentMethod === 'credit_card') return 'Cartão de Crédito';
    if (pedido.formaPagamento === 'dinheiro') return 'Dinheiro';
    return pedido.paymentMethod || 'Pagamento online';
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#ea1d2c" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100 px-4">
        <Text className="text-5xl mb-4">⚠️</Text>
        <Text className="text-red-600 text-base text-center mb-4">{error}</Text>
        <TouchableOpacity 
          className="bg-red-600 px-6 py-3 rounded-lg"
          onPress={() => {
            console.log('🔄 Tentando recarregar pedidos...');
            fetchPedidos();
          }}
        >
          <Text className="text-white text-base font-bold">Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      <FlatList
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#ea1d2c']}
            tintColor="#ea1d2c"
          />
        }
        data={pedidos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const statusInfo = statusMap[item.status] || { label: item.status, color: '#888', icon: 'help-circle-outline' };
          const isPedidoAtual = item.status === 'pendente' || item.status === 'preparo' || item.status === 'em_entrega';
          
          let totalPedido = item.total;
          if (!totalPedido && item.itens) {
            const subtotal = item.itens.reduce((sum: number, itemPedido: any) => {
              return sum + (itemPedido.precoUnitario * itemPedido.quantidade);
            }, 0);
            totalPedido = subtotal + (item.taxaEntrega || 0);
          }
          
          return (
            <TouchableOpacity 
              activeOpacity={0.85}
              onPress={async () => {
                setSelectedPedido(item);
                setModalVisible(true);
                // Verificar se o pedido já foi avaliado
                try {
                  const avaliacaoExistente = await avaliacaoService.buscarPorPedido(parseInt(item.id));
                  setPedidoAvaliado(!!avaliacaoExistente);
                } catch {
                  setPedidoAvaliado(false);
                }
              }}
            >
              <View className={`bg-white rounded-2xl mb-4 border overflow-hidden shadow-sm ${
                isPedidoAtual 
                  ? 'border-red-600 border-2 bg-red-50' 
                  : 'border-gray-100'
              }`}>
                {isPedidoAtual && (
                  <View className="bg-red-600 px-3 py-1 self-start ml-4 mt-2 rounded-full">
                    <Text className="text-white text-xs font-bold tracking-wide">PEDIDO EM ANDAMENTO</Text>
                  </View>
                )}
                
                <View className="flex-row items-center p-4">
                  {item.estabelecimento?.imagem ? (
                    <Image 
                      source={{ uri: item.estabelecimento.imagem }} 
                      className="w-12 h-12 rounded-xl mr-3 bg-gray-100"
                    />
                  ) : (
                    <Image 
                      source={require('../assets/icon.png')} 
                      className="w-12 h-12 rounded-xl mr-3 bg-gray-100"
                    />
                  )}
                  
                  <View className="flex-1">
                    <Text className="font-bold text-base text-gray-800">{item.estabelecimento?.nome || 'Estabelecimento'}</Text>
                    <Text className="font-semibold text-sm text-gray-600 mt-1">Pedido ID: {item.id}</Text>
                  </View>
                  
                  <View className="items-end">
                    <Text className={`font-bold text-lg ${isPedidoAtual ? 'text-red-600' : 'text-gray-800'}`}>
                      R$ {totalPedido?.toFixed(2) ?? '--'}
                    </Text>
                  </View>
                </View>
                
                <View className="flex-row items-center px-4 mb-2">
                  <Ionicons name={statusInfo.icon} size={18} color={statusInfo.color} />
                  <Text className="text-base font-semibold ml-2" style={{ color: statusInfo.color }}>
                    {statusInfo.label}
                  </Text>
                </View>
                
                {item.enderecoEntrega && (
                  <View className="flex-row items-center mx-4 mb-2 px-2 py-1 bg-gray-50 rounded-lg">
                    <Ionicons name="location-outline" size={14} color="#666" />
                    <Text className="text-sm text-gray-600 ml-2 flex-1" numberOfLines={1}>
                      {item.enderecoEntrega}
                    </Text>
                  </View>
                )}
                
                {(item.formaPagamento || item.formaPagamentoEntrega || item.paymentMethod) && (
                  <View className="flex-row items-center mx-4 mb-2 px-2 py-1 bg-gray-50 rounded-lg">
                    <Ionicons name={getPaymentIcon(item)} size={14} color="#666" />
                    <Text className="text-sm text-gray-600 ml-2 flex-1">
                      {getPaymentText(item)}
                    </Text>
                  </View>
                )}
                
                <Text className="text-sm text-gray-500 px-4 pb-4">
                  Data: {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-gray-500 text-base">Nenhum pedido encontrado</Text>
          </View>
        }
      />
      
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[85%] min-h-[60%]">
            <View className="flex-row justify-between items-center px-5 py-4 border-b border-gray-200">
              <Text className="text-xl font-bold text-gray-800">Detalhes do Pedido</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                className="w-8 h-8 rounded-full bg-gray-100 justify-center items-center"
              >
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView className="px-5 py-4" showsVerticalScrollIndicator={false}>
              {selectedPedido && (
                <>
                  <View className="flex-row items-center mb-5 pb-4 border-b border-gray-200">
                    {selectedPedido.estabelecimento?.imagem ? (
                      <Image 
                        source={{ uri: selectedPedido.estabelecimento.imagem }} 
                        className="w-16 h-16 rounded-2xl bg-gray-100"
                      />
                    ) : (
                      <Image 
                        source={require('../assets/icon.png')} 
                        className="w-16 h-16 rounded-2xl bg-gray-100"
                      />
                    )}
                    <View className="ml-3 flex-1">
                      <Text className="text-lg font-bold text-gray-800">{selectedPedido.estabelecimento?.nome || 'Estabelecimento'}</Text>
                      <Text className="text-sm text-gray-600">Pedido #{selectedPedido.id}</Text>
                    </View>
                  </View>
                  
                  <View className="mb-4">
                    <Text className="font-semibold mb-1">
                      Status: <Text style={{ color: statusMap[selectedPedido.status]?.color || '#888' }}>
                        {statusMap[selectedPedido.status]?.label || selectedPedido.status}
                      </Text>
                    </Text>
                    <Text className="font-semibold mb-4">
                      Data: <Text className="font-normal">{new Date(selectedPedido.createdAt).toLocaleString()}</Text>
                    </Text>
                  </View>
                  
                  {selectedPedido.enderecoEntrega && (
                    <View className="bg-blue-50 rounded-xl p-3 mb-3 border border-blue-200">
                      <Text className="font-bold text-sm text-red-600 mb-2">
                        <Ionicons name="location" size={16} color="#ea1d2c" /> Endereço de Entrega:
                      </Text>
                      <Text className="ml-5 text-base leading-6 text-gray-700">
                        {selectedPedido.enderecoEntrega}
                      </Text>
                    </View>
                  )}
                  
                  {selectedPedido.paymentMethod && !selectedPedido.formaPagamentoEntrega && (
                    <View className="bg-green-50 rounded-xl p-3 mb-3 border border-green-200">
                      <Text className="font-bold text-sm text-red-600 mb-2">
                        <Ionicons name="card" size={16} color="#ea1d2c" /> Pagamento Online:
                      </Text>
                      <Text className="ml-5 mb-2">
                        <Text className="font-semibold">Forma: </Text>
                        <Text>
                          {selectedPedido.paymentMethod === 'pix' ? '📱 PIX' : 
                           selectedPedido.paymentMethod === 'credit_card' ? '💳 Cartão de Crédito' : 
                           selectedPedido.paymentMethod}
                        </Text>
                      </Text>
                      {selectedPedido.paymentStatus && (
                        <Text className="ml-5">
                          <Text className="font-semibold">Status: </Text>
                          <Text className="font-bold" style={{
                            color: selectedPedido.paymentStatus === 'approved' ? '#2ecc71' : 
                                   selectedPedido.paymentStatus === 'pending' ? '#f39c12' : '#e74c3c',
                          }}>
                            {selectedPedido.paymentStatus === 'approved' ? '✅ Aprovado' :
                             selectedPedido.paymentStatus === 'pending' ? '⏳ Pendente' :
                             selectedPedido.paymentStatus}
                          </Text>
                        </Text>
                      )}
                    </View>
                  )}
                  
                  {selectedPedido.formaPagamentoEntrega && (
                    <View className="bg-red-50 rounded-xl p-3 mb-3 border border-red-200">
                      <Text className="font-bold text-sm text-red-600 mb-2">
                        <Ionicons name="card" size={16} color="#ea1d2c" /> Pagamento na Entrega:
                      </Text>
                      <Text className="ml-5 mb-1">
                        <Text className="font-semibold">Forma: </Text>
                        <Text>
                          {selectedPedido.formaPagamentoEntrega === 'dinheiro' ? '💵 Dinheiro' : 
                           selectedPedido.formaPagamentoEntrega === 'debito' ? '💳 Cartão de Débito' : 
                           '💳 Cartão de Crédito'}
                        </Text>
                      </Text>
                      {selectedPedido.precisaTroco && (
                        <Text className="ml-5 mb-1">
                          <Text className="font-semibold">Troco: </Text>
                          <Text>Sim, para R$ {selectedPedido.trocoParaQuanto?.toFixed(2)}</Text>
                        </Text>
                      )}
                      {selectedPedido.precisaTroco === false && (
                        <Text className="ml-5 mb-1">
                          <Text className="font-semibold">Troco: </Text>
                          <Text>Não precisa</Text>
                        </Text>
                      )}
                    </View>
                  )}
                  
                  <Text className="font-bold text-base mb-3">Itens do pedido:</Text>
                  {selectedPedido.itens && selectedPedido.itens.length > 0 ? (
                    selectedPedido.itens.map((item, idx) => {
                      const itemTotal = item.precoUnitario * item.quantidade;
                      return (
                        <View key={idx} className="flex-row justify-between items-center py-2 px-3 bg-gray-50 rounded-lg mb-2">
                          <View className="flex-1">
                            <Text className="text-base font-medium text-gray-800 mb-1">
                              {item.quantidade}x {item.produto?.nome || 'Produto'}
                            </Text>
                            {!!item.observacao && (
                              <Text className="text-xs text-gray-500 mb-1">Obs.: {item.observacao}</Text>
                            )}
                            <Text className="text-sm text-gray-600">R$ {item.precoUnitario?.toFixed(2)}</Text>
                          </View>
                          <Text className="text-base font-bold text-red-600">
                            R$ {itemTotal.toFixed(2)}
                          </Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text className="ml-3 mb-2 text-gray-600">Produtos não disponíveis</Text>
                  )}
                  
                  {selectedPedido.itens && selectedPedido.itens.length > 0 && (
                    <View className="bg-gray-50 rounded-xl p-4 mt-4 border border-gray-200">
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-base text-gray-600">Subtotal:</Text>
                        <Text className="text-base font-medium text-gray-800">
                          R$ {selectedPedido.itens.reduce((sum, item) => sum + (item.precoUnitario * item.quantidade), 0).toFixed(2)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-base text-gray-600">Taxa de entrega:</Text>
                        <Text className="text-base font-medium text-gray-800">
                          R$ {(selectedPedido.taxaEntrega || 0).toFixed(2)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between items-center pt-2 mt-2 border-t border-gray-300">
                        <Text className="text-lg font-bold text-gray-800">Total:</Text>
                        <Text className="text-lg font-bold text-red-600">
                          R$ {(selectedPedido.itens.reduce((sum, item) => sum + (item.precoUnitario * item.quantidade), 0) + (selectedPedido.taxaEntrega || 0)).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  {selectedPedido.status === 'entregue' && (
                    <View className="bg-gray-50 rounded-xl p-4 mt-4 border border-gray-200">
                      <Text className="text-lg font-bold text-gray-800 mb-3">Avalie seu pedido:</Text>
                      {pedidoAvaliado ? (
                        <View className="bg-green-100 rounded-lg p-3 items-center">
                          <Text className="text-green-800 font-bold text-base">✅ Você já avaliou este pedido.</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          className="bg-orange-500 rounded-xl p-4 items-center"
                          onPress={async () => {
                            try {
                              // Verificar se pode avaliar antes de mostrar o modal
                              const podeAvaliar = await avaliacaoService.podeAvaliar(parseInt(selectedPedido.id));
                              
                              if (!podeAvaliar.canAvaliar) {
                                Alert.alert('Atenção', podeAvaliar.reason || 'Não é possível avaliar este pedido');
                                return;
                              }
                              
                              if (!podeAvaliar.isWithinWindow) {
                                Alert.alert('Prazo expirado', 'O prazo para avaliar este pedido expirou (30 minutos após a entrega)');
                                return;
                              }
                              
                              setModalVisible(false);
                              setPedidoParaAvaliar(selectedPedido);
                              setAvaliacaoModalVisible(true);
                            } catch (error: any) {
                              console.error('Erro ao verificar se pode avaliar:', error);
                              Alert.alert('Erro', 'Erro ao verificar se pode avaliar. Tente novamente.');
                            }
                          }}
                        >
                          <Ionicons name="star" size={24} color="#fff" />
                          <Text className="text-white font-bold text-base mt-2">Avaliar Pedido</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                  
                  {(selectedPedido.status === 'pendente' || selectedPedido.status === 'preparo' || selectedPedido.status === 'em_entrega') && (
                    <View className="bg-blue-50 rounded-xl p-4 mt-4 items-center border border-blue-200">
                      <Text className="text-base font-bold text-blue-700 text-center">
                        {selectedPedido.status === 'pendente' 
                          ? '⏳ Aguardando confirmação do estabelecimento!' 
                          : selectedPedido.status === 'preparo'
                          ? '🍳 Seu pedido está sendo preparado!'
                          : '🚗💨 Seu pedido saiu para entrega!'}
                      </Text>
                    </View>
                  )}
                  
                  {selectedPedido.status === 'entregue' && (
                    <View className="bg-green-50 rounded-xl p-4 mt-4 items-center border border-green-200">
                      <Text className="text-base font-bold text-green-700 text-center">✅ Pedido entregue com sucesso!</Text>
                    </View>
                  )}
                  
                  {/* Botão de Chat */}
                  {selectedPedido.status !== 'pendente' && (
                    <TouchableOpacity
                      className="bg-red-600 rounded-xl p-4 mt-4 flex-row items-center justify-center"
                      onPress={() => {
                        setModalVisible(false);
                        navigation.navigate('Chat' as never, {
                          pedidoId: parseInt(selectedPedido.id),
                          estabelecimentoNome: selectedPedido.estabelecimento?.nome || 'Restaurante',
                          estabelecimentoImagem: selectedPedido.estabelecimento?.imagem,
                          pedidoStatus: selectedPedido.status,
                        } as never);
                      }}
                    >
                      <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
                      <Text className="text-white font-bold text-base ml-2">Abrir Chat</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Avaliação */}
      {pedidoParaAvaliar && (
        <AvaliacaoModal
          visible={avaliacaoModalVisible}
          pedidoId={parseInt(pedidoParaAvaliar.id)}
          estabelecimentoNome={pedidoParaAvaliar.estabelecimento?.nome || 'Restaurante'}
          estabelecimentoImagem={pedidoParaAvaliar.estabelecimento?.imagem}
          onClose={() => {
            setAvaliacaoModalVisible(false);
            setPedidoParaAvaliar(null);
          }}
          onSuccess={() => {
            setPedidoAvaliado(true);
            fetchPedidos(); // Recarregar pedidos para atualizar status
          }}
        />
      )}
    </View>
  );
};

export default PedidoListScreen;


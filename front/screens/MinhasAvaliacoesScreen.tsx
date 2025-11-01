import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { avaliacaoService } from '../services/avaliacaoService';

const MinhasAvaliacoesScreen: React.FC = () => {
  const navigation = useNavigation();
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAvaliacoes();
  }, []);

  const loadAvaliacoes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await avaliacaoService.listarMinhasAvaliacoes(50, 0);
      setAvaliacoes(response.avaliacoes || []);
    } catch (err: any) {
      console.error('Erro ao carregar avaliações:', err);
      setError(err.response?.data?.error || 'Erro ao carregar avaliações');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAvaliacoes();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#ea1d2c" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-3 flex-row items-center">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mr-4"
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 flex-1">
          Avaliações
        </Text>
        {avaliacoes.length > 0 && (
          <Text className="text-sm text-gray-500">
            {avaliacoes.length} {avaliacoes.length === 1 ? 'avaliação' : 'avaliações'}
          </Text>
        )}
      </View>

      {error ? (
        <View className="flex-1 justify-center items-center px-4">
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text className="text-red-600 text-center mt-4 mb-2">{error}</Text>
          <TouchableOpacity
            onPress={loadAvaliacoes}
            className="bg-red-500 px-6 py-2 rounded-lg mt-4"
          >
            <Text className="text-white font-semibold">Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      ) : avaliacoes.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View className="flex-1 justify-center items-center px-4 py-16">
            <Ionicons name="star-outline" size={64} color="#D1D5DB" />
            <Text className="text-xl font-bold text-gray-800 mt-4 mb-2">
              Nenhuma avaliação ainda
            </Text>
            <Text className="text-gray-500 text-center">
              Suas avaliações aparecerão aqui após você avaliar seus pedidos
            </Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ padding: 16 }}
        >
          {avaliacoes.map((avaliacao) => (
            <View
              key={avaliacao.id}
              className="bg-white rounded-xl p-4 mb-4 border border-gray-200 shadow-sm"
            >
              {/* Header da avaliação */}
              <View className="flex-row items-start mb-3">
                {avaliacao.estabelecimento?.imagem ? (
                  <Image
                    source={{ uri: avaliacao.estabelecimento.imagem }}
                    className="w-16 h-16 rounded-xl mr-3"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-16 h-16 rounded-xl mr-3 bg-gray-100 items-center justify-center">
                    <Ionicons name="restaurant" size={24} color="#9CA3AF" />
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-900 mb-1">
                    {avaliacao.estabelecimento?.nome || 'Estabelecimento'}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    Pedido #{avaliacao.pedidoId} • {formatDate(avaliacao.createdAt)}
                  </Text>
                </View>
              </View>

              {/* Nota */}
              <View className="flex-row items-center mb-3">
                <Text className="text-sm font-semibold text-gray-700 mr-2">
                  Avaliação:
                </Text>
                <View className="flex-row items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= avaliacao.nota ? 'star' : 'star-outline'}
                      size={20}
                      color={star <= avaliacao.nota ? '#fbbf24' : '#D1D5DB'}
                    />
                  ))}
                  <Text className="text-base font-bold text-gray-800 ml-2">
                    {avaliacao.nota.toFixed(1)}
                  </Text>
                </View>
              </View>

              {/* Nota do entregador (se existir) */}
              {avaliacao.notaEntregador && (
                <View className="flex-row items-center mb-3">
                  <Text className="text-sm font-semibold text-gray-700 mr-2">
                    Entregador:
                  </Text>
                  <View className="flex-row items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= avaliacao.notaEntregador ? 'star' : 'star-outline'}
                        size={16}
                        color={star <= avaliacao.notaEntregador ? '#fbbf24' : '#D1D5DB'}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Motivos */}
              {avaliacao.motivos && Array.isArray(avaliacao.motivos) && avaliacao.motivos.length > 0 && (
                <View className="flex-row flex-wrap mb-3">
                  {avaliacao.motivos.map((motivo: string, idx: number) => (
                    <View
                      key={idx}
                      className="bg-orange-100 px-3 py-1 rounded-full mr-2 mb-2"
                    >
                      <Text className="text-xs text-orange-700 font-medium">
                        {motivo}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Comentário */}
              {avaliacao.comentario && (
                <View className="bg-gray-50 rounded-lg p-3 mb-3">
                  <Text className="text-sm text-gray-700">
                    {avaliacao.comentario}
                  </Text>
                </View>
              )}

              {/* Botão para ver pedido */}
              <TouchableOpacity
                onPress={() => {
                  navigation.navigate('HomeTabs' as never, { screen: 'Pedidos' } as never);
                }}
                className="flex-row items-center justify-center py-2 border border-gray-300 rounded-lg mt-2"
              >
                <Ionicons name="receipt-outline" size={16} color="#6B7280" />
                <Text className="text-sm text-gray-600 ml-2">
                  Ver Pedido
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default MinhasAvaliacoesScreen;


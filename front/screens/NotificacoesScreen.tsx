import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NotificacaoService, Notificacao } from '../services/notificacaoService';

const NotificacoesScreen: React.FC = () => {
  const navigation = useNavigation();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotificacoes = async () => {
    try {
      setLoading(true);
      const data = await NotificacaoService.listar();
      setNotificacoes(data);
    } catch (error: any) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadNotificacoes();
    }, [])
  );

  const handleMarcarComoLida = async (notificacao: Notificacao) => {
    if (!notificacao.lida) {
      try {
        await NotificacaoService.marcarComoLida(notificacao.id);
        setNotificacoes(prev =>
          prev.map(n =>
            n.id === notificacao.id ? { ...n, lida: true, lidaEm: new Date().toISOString() } : n
          )
        );
      } catch (error) {
        console.error('Erro ao marcar como lida:', error);
      }
    }
  };

  const handleMarcarTodasComoLidas = async () => {
    try {
      await NotificacaoService.marcarTodasComoLidas();
      setNotificacoes(prev => prev.map(n => ({ ...n, lida: true, lidaEm: new Date().toISOString() })));
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const handleDeletar = async (notificacaoId: number) => {
    try {
      await NotificacaoService.deletar(notificacaoId);
      setNotificacoes(prev => prev.filter(n => n.id !== notificacaoId));
    } catch (error) {
      console.error('Erro ao deletar:', error);
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'STATUS_PEDIDO':
        return { name: 'receipt-outline' as const, color: '#e5293e' };
      case 'MENSAGEM_RESTAURANTE':
        return { name: 'chatbubble-ellipses-outline' as const, color: '#2196F3' };
      case 'PROMOCAO_CUPOM':
        return { name: 'gift-outline' as const, color: '#ff9800' };
      case 'AVISO_IMPORTANTE':
        return { name: 'warning-outline' as const, color: '#f44336' };
      case 'EVENTO_SISTEMA':
        return { name: 'checkmark-circle-outline' as const, color: '#4caf50' };
      case 'AVALIAR_PEDIDO':
        return { name: 'star' as const, color: '#FFD700' };
      default:
        return { name: 'notifications-outline' as const, color: '#666' };
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diff / (1000 * 60));
    const diffHours = Math.floor(diff / (1000 * 60 * 60));
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Agora';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const handleNotificacaoPress = (notificacao: Notificacao) => {
    handleMarcarComoLida(notificacao);

    // Navegar conforme o tipo
    if (notificacao.pedidoId) {
      if (notificacao.tipo === 'MENSAGEM_RESTAURANTE') {
        // Abrir chat
        navigation.navigate('Chat' as never, {
          pedidoId: notificacao.pedidoId,
          estabelecimentoNome: notificacao.pedido?.estabelecimento?.nome || 'Restaurante',
          estabelecimentoImagem: notificacao.pedido?.estabelecimento?.imagem,
          pedidoStatus: notificacao.pedido?.status || 'pendente',
        } as never);
      } else if (notificacao.tipo === 'AVALIAR_PEDIDO') {
        // Abrir tela de pedidos e mostrar modal de avaliação
        (navigation as any).navigate('HomeTabs', { 
          screen: 'Pedidos',
          params: { avaliarPedidoId: notificacao.pedidoId }
        });
      } else {
        // Abrir tela de pedidos
        (navigation as any).navigate('HomeTabs', { screen: 'Pedidos' });
      }
    }
  };

  const renderItem = ({ item }: { item: Notificacao }) => {
    const icon = getTipoIcon(item.tipo);

    return (
      <TouchableOpacity
        style={[styles.notificacaoItem, !item.lida && styles.notificacaoNaoLida]}
        onPress={() => handleNotificacaoPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificacaoContent}>
          <View style={[styles.iconContainer, { backgroundColor: `${icon.color}15` }]}>
            <Ionicons name={icon.name} size={24} color={icon.color} />
          </View>

          <View style={styles.notificacaoText}>
            <View style={styles.notificacaoHeader}>
              <Text style={[styles.titulo, !item.lida && styles.tituloNaoLido]} numberOfLines={1}>
                {item.titulo}
              </Text>
              {!item.lida && <View style={styles.badge} />}
            </View>
            <Text style={styles.mensagem} numberOfLines={2}>
              {item.mensagem}
            </Text>
            <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDeletar(item.id);
            }}
          >
            <Ionicons name="close" size={20} color="#999" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const naoLidasCount = notificacoes.filter(n => !n.lida).length;

  if (loading && notificacoes.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e5293e" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificações</Text>
        {naoLidasCount > 0 && (
          <TouchableOpacity onPress={handleMarcarTodasComoLidas} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Marcar todas como lidas</Text>
          </TouchableOpacity>
        )}
      </View>

      {naoLidasCount > 0 && (
        <View style={styles.banner}>
          <Ionicons name="notifications" size={18} color="#fff" />
          <Text style={styles.bannerText}>
            {naoLidasCount} {naoLidasCount === 1 ? 'notificação não lida' : 'notificações não lidas'}
          </Text>
        </View>
      )}

      <FlatList
        data={notificacoes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Nenhuma notificação</Text>
            <Text style={styles.emptySubtext}>
              Suas notificações aparecerão aqui
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadNotificacoes} tintColor="#e5293e" />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllText: {
    fontSize: 13,
    color: '#e5293e',
    fontWeight: '600',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e5293e',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  bannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    padding: 12,
  },
  notificacaoItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificacaoNaoLida: {
    borderLeftWidth: 4,
    borderLeftColor: '#e5293e',
    backgroundColor: '#fff5f5',
  },
  notificacaoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificacaoText: {
    flex: 1,
  },
  notificacaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  titulo: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tituloNaoLido: {
    fontWeight: '700',
    color: '#000',
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5293e',
  },
  mensagem: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default NotificacoesScreen;


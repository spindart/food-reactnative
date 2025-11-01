import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ChatService, Conversa } from '../services/chatService';

const ConversasEstabelecimentoScreen: React.FC = () => {
  const navigation = useNavigation();
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversas = async () => {
    try {
      setLoading(true);
      const data = await ChatService.listConversas();
      setConversas(data);
    } catch (error: any) {
      console.error('Erro ao carregar conversas:', error);
      Alert.alert('Erro', error.message || 'Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadConversas();
    }, [])
  );

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparo':
        return '#ff9800';
      case 'entregue':
        return '#4caf50';
      case 'cancelado':
        return '#f44336';
      default:
        return '#2196f3';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'Pendente';
      case 'preparo':
        return 'Em preparo';
      case 'entregue':
        return 'Entregue';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const openChat = (conversa: Conversa) => {
    navigation.navigate('ChatEstabelecimento' as never, {
      pedidoId: conversa.pedidoId,
      clienteNome: conversa.pedido.cliente?.nome || 'Cliente',
      pedidoStatus: conversa.pedido.status,
    } as never);
  };

  const openPedido = (conversa: Conversa) => {
    if (conversa.pedido.estabelecimento) {
      navigation.navigate('PedidosDoEstabelecimento' as never, {
        estabelecimento: {
          id: conversa.pedido.estabelecimento.id,
          nome: conversa.pedido.estabelecimento.nome,
        },
      } as never);
    }
  };

  const renderItem = ({ item }: { item: Conversa }) => {
    const ultimaMensagem = item.mensagens && item.mensagens.length > 0 
      ? item.mensagens[item.mensagens.length - 1] 
      : null;
    
    const preview = ultimaMensagem?.texto 
      ? (ultimaMensagem.texto.length > 50 
          ? ultimaMensagem.texto.substring(0, 50) + '...' 
          : ultimaMensagem.texto)
      : ultimaMensagem?.imagemUrl 
        ? '📷 Imagem' 
        : 'Nenhuma mensagem ainda';

    return (
      <TouchableOpacity
        style={styles.conversaItem}
        onPress={() => openChat(item)}
        activeOpacity={0.7}
      >
        <View style={styles.conversaContent}>
          <View style={styles.conversaHeader}>
            <View style={styles.conversaInfo}>
              <Text style={styles.clienteNome} numberOfLines={1}>
                {item.pedido.cliente?.nome || 'Cliente'}
              </Text>
              <View style={styles.statusContainer}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(item.pedido.status) },
                  ]}
                />
                <Text style={styles.statusText}>{getStatusText(item.pedido.status)}</Text>
                <Text style={styles.pedidoId}> • Pedido #{item.pedidoId}</Text>
              </View>
            </View>
            <View style={styles.conversaMeta}>
              {item.unreadCount && item.unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              ) : null}
              <Text style={styles.time}>
                {formatTime(item.ultimaMensagemAt || item.createdAt)}
              </Text>
            </View>
          </View>
          
          <Text style={styles.preview} numberOfLines={2}>
            {preview}
          </Text>
          
          {/* Botão para abrir pedido */}
          <TouchableOpacity
            style={styles.pedidoButton}
            onPress={(e) => {
              e.stopPropagation();
              openPedido(item);
            }}
          >
            <Ionicons name="receipt-outline" size={16} color="#e5293e" />
            <Text style={styles.pedidoButtonText}>Ver Pedido #{item.pedidoId}</Text>
          </TouchableOpacity>
        </View>
        
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>
    );
  };

  if (loading) {
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
        <Text style={styles.headerTitle}>Conversas</Text>
        <Text style={styles.headerSubtitle}>
          {conversas.length} {conversas.length === 1 ? 'conversa' : 'conversas'}
        </Text>
      </View>

      <FlatList
        data={conversas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => {
          // Agrupar por estabelecimento - mostrar header quando mudar
          const estabelecimentoAtual = item.pedido.estabelecimento?.nome || 'Sem estabelecimento';
          const estabelecimentoAnterior = index > 0 && conversas[index - 1]?.pedido.estabelecimento?.nome;
          const mostrarHeader = estabelecimentoAtual !== estabelecimentoAnterior;
          
          return (
            <>
              {mostrarHeader && (
                <View style={styles.estabelecimentoHeader}>
                  <Ionicons name="storefront" size={20} color="#e5293e" />
                  <Text style={styles.estabelecimentoHeaderText}>{estabelecimentoAtual}</Text>
                </View>
              )}
              {renderItem({ item })}
            </>
          );
        }}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Nenhuma conversa ainda</Text>
            <Text style={styles.emptySubtext}>
              As conversas aparecerão aqui quando os clientes enviarem mensagens
            </Text>
          </View>
        }
        refreshing={loading}
        onRefresh={loadConversas}
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
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  list: {
    padding: 12,
    paddingBottom: 20,
  },
  estabelecimentoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#e5293e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  estabelecimentoHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,
  },
  conversaItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  conversaContent: {
    flex: 1,
    marginRight: 12,
  },
  conversaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  conversaInfo: {
    flex: 1,
  },
  clienteNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  pedidoId: {
    fontSize: 12,
    color: '#999',
  },
  estabelecimentoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffe5e5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
    alignSelf: 'flex-start',
    gap: 4,
  },
  estabelecimentoNome: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e5293e',
  },
  conversaMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  badge: {
    backgroundColor: '#e5293e',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  time: {
    fontSize: 11,
    color: '#999',
  },
  preview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  pedidoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffe5e5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  pedidoButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e5293e',
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

export default ConversasEstabelecimentoScreen;


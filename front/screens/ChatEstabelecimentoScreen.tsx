import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';
import TypingIndicator from '../components/TypingIndicator';
import { ChatService, Mensagem, Conversa } from '../services/chatService';

const ChatEstabelecimentoScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { pedidoId, clienteNome, pedidoStatus } = route.params as any;
  
  const [conversa, setConversa] = useState<Conversa | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [templates, setTemplates] = useState<{ id: number; texto: string }[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    loadConversa();
    loadTemplates();
    setupWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [pedidoId]);

  const setupWebSocket = () => {
    const ws = new WebSocket('ws://192.168.1.95:3000'); // Substitua pelo IP do seu servidor
    
    ws.onopen = () => {
      console.log('WebSocket conectado');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'chat_message' && data.pedidoId === pedidoId) {
          loadConversa();
        } else if (data.type === 'chat_typing' && data.pedidoId === pedidoId) {
          setTyping(data.isTyping);
        }
      } catch (error) {
        console.error('Erro ao processar mensagem WebSocket:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('Erro WebSocket:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket desconectado');
    };

    wsRef.current = ws;
  };

  const loadConversa = async () => {
    try {
      setLoading(true);
      const data = await ChatService.getConversa(pedidoId);
      setConversa(data);
      
      await ChatService.marcarLido(pedidoId);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('Erro ao carregar conversa:', error);
      Alert.alert('Erro', error.message || 'Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await ChatService.getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    }
  };

  const handleSendText = async (text: string) => {
    if (!conversa?.canSend) {
      Alert.alert('Atenção', conversa?.reason || 'Não é possível enviar mensagens');
      return;
    }

    try {
      setSending(true);
      setShowTemplates(false);
      await ChatService.sendMensagemTexto(pedidoId, text);
      await loadConversa();
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      Alert.alert('Erro', error.message || 'Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const handleSendTemplate = async (templateTexto: string) => {
    await handleSendText(templateTexto);
  };

  const handleSendImage = async (imageUri: string) => {
    if (!conversa?.canSend) {
      Alert.alert('Atenção', conversa?.reason || 'Não é possível enviar mensagens');
      return;
    }

    try {
      setSending(true);
      await ChatService.sendMensagemImagem(pedidoId, imageUri);
      await loadConversa();
    } catch (error: any) {
      console.error('Erro ao enviar imagem:', error);
      Alert.alert('Erro', error.message || 'Erro ao enviar imagem');
    } finally {
      setSending(false);
    }
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

  if (loading && !conversa) {
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {clienteNome || 'Cliente'}
          </Text>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(pedidoStatus) },
              ]}
            />
            <Text style={styles.statusText}>{getStatusText(pedidoStatus)}</Text>
            <Text style={styles.pedidoId}> • Pedido #{pedidoId}</Text>
          </View>
        </View>
      </View>

      {/* Templates */}
      {showTemplates && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.templatesContainer}
          contentContainerStyle={styles.templatesContent}
        >
          {templates.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={styles.templateButton}
              onPress={() => handleSendTemplate(template.texto)}
            >
              <Text style={styles.templateText}>{template.texto}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Mensagens */}
      <FlatList
        ref={flatListRef}
        data={conversa?.mensagens || []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <MessageBubble mensagem={item} />}
        contentContainerStyle={styles.messagesContainer}
        inverted={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {conversa?.canSend
                ? 'Envie uma mensagem para o cliente'
                : conversa?.reason || 'Nenhuma mensagem ainda'}
            </Text>
          </View>
        }
        ListFooterComponent={typing ? <TypingIndicator /> : null}
      />

      {/* Warning */}
      {!conversa?.canSend && conversa?.reason && (
        <View style={styles.warningBanner}>
          <Ionicons name="information-circle" size={20} color="#ff9800" />
          <Text style={styles.warningText}>{conversa.reason}</Text>
        </View>
      )}

      {/* Input com botão de templates */}
      <View>
        <TouchableOpacity
          style={styles.templateToggle}
          onPress={() => setShowTemplates(!showTemplates)}
        >
          <Ionicons
            name={showTemplates ? 'chevron-down' : 'flash-outline'}
            size={20}
            color="#e5293e"
          />
          <Text style={styles.templateToggleText}>
            {showTemplates ? 'Ocultar' : 'Mensagens rápidas'}
          </Text>
        </TouchableOpacity>

        <MessageInput
          onSendText={handleSendText}
          onSendImage={handleSendImage}
          disabled={!conversa?.canSend || sending}
          placeholder="Envie uma mensagem para o cliente"
        />
      </View>

      {sending && (
        <View style={styles.sendingOverlay}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
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
  templatesContainer: {
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    maxHeight: 120,
  },
  templatesContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  templateButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5293e',
    marginRight: 8,
  },
  templateText: {
    fontSize: 14,
    color: '#e5293e',
    fontWeight: '500',
  },
  templateToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 6,
  },
  templateToggleText: {
    fontSize: 13,
    color: '#e5293e',
    fontWeight: '500',
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#856404',
  },
  sendingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatEstabelecimentoScreen;


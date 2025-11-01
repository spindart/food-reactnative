import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MessageBubbleProps {
  mensagem: {
    texto?: string;
    imagemUrl?: string;
    isFromEstabelecimento: boolean;
    status: 'enviado' | 'recebido' | 'lido';
    createdAt: string;
    remetente: {
      nome: string;
    };
  };
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ mensagem }) => {
  const isFromEstabelecimento = mensagem.isFromEstabelecimento;
  
  // Formata hora
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Ícone de status
  const getStatusIcon = () => {
    if (!isFromEstabelecimento) {
      if (mensagem.status === 'lido') {
        return <Ionicons name="checkmark-done" size={14} color="#34b7f1" />;
      } else if (mensagem.status === 'recebido') {
        return <Ionicons name="checkmark-done" size={14} color="#999" />;
      } else {
        return <Ionicons name="checkmark" size={14} color="#999" />;
      }
    }
    return null;
  };

  return (
    <View
      style={[
        styles.container,
        isFromEstabelecimento ? styles.containerRight : styles.containerLeft,
      ]}
    >
      {mensagem.imagemUrl && (
        <Image
          source={{ uri: mensagem.imagemUrl }}
          style={[
            styles.imagem,
            isFromEstabelecimento ? styles.imagemRight : styles.imagemLeft,
          ]}
          resizeMode="cover"
        />
      )}
      
      {mensagem.texto && (
        <View
          style={[
            styles.bubble,
            isFromEstabelecimento ? styles.bubbleRight : styles.bubbleLeft,
          ]}
        >
          <Text
            style={[
              styles.texto,
              isFromEstabelecimento ? styles.textoRight : styles.textoLeft,
            ]}
          >
            {mensagem.texto}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.footer,
          isFromEstabelecimento ? styles.footerRight : styles.footerLeft,
        ]}
      >
        <Text style={styles.hora}>{formatTime(mensagem.createdAt)}</Text>
        {getStatusIcon()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    maxWidth: '75%',
  },
  containerLeft: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  containerRight: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  bubbleLeft: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  bubbleRight: {
    backgroundColor: '#e5293e',
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 4,
  },
  texto: {
    fontSize: 15,
    lineHeight: 20,
  },
  textoLeft: {
    color: '#333',
  },
  textoRight: {
    color: '#fff',
  },
  imagem: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  imagemLeft: {
    borderTopLeftRadius: 4,
  },
  imagemRight: {
    borderTopRightRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  footerLeft: {
    alignSelf: 'flex-start',
  },
  footerRight: {
    alignSelf: 'flex-end',
  },
  hora: {
    fontSize: 11,
    color: '#999',
  },
});

export default MessageBubble;


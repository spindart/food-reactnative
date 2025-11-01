import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { avaliacaoService, CriarAvaliacaoData } from '../services/avaliacaoService';

interface AvaliacaoModalProps {
  visible: boolean;
  pedidoId: number;
  estabelecimentoNome: string;
  estabelecimentoImagem?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const MOTIVOS_POSITIVOS = [
  'Excelente atendimento',
  'Comida deliciosa',
  'Entrega rápida',
  'Embalagem perfeita',
  'Pedido completo',
  'Superou expectativas',
];

const MOTIVOS_NEGATIVOS = [
  'Demorado',
  'Comida fria',
  'Embalagem ruim',
  'Pedido incompleto',
  'Atendimento ruim',
  'Comida diferente do esperado',
];

export default function AvaliacaoModal({
  visible,
  pedidoId,
  estabelecimentoNome,
  estabelecimentoImagem,
  onClose,
  onSuccess,
}: AvaliacaoModalProps) {
  const [notaRestaurante, setNotaRestaurante] = useState<number>(0);
  const [notaEntregador, setNotaEntregador] = useState<number>(0);
  const [comentario, setComentario] = useState<string>('');
  const [motivosSelecionados, setMotivosSelecionados] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showAgradecimento, setShowAgradecimento] = useState<boolean>(false);

  // Resetar estado quando o modal abrir e verificar se pode avaliar
  useEffect(() => {
    if (visible) {
      setNotaRestaurante(0);
      setNotaEntregador(0);
      setComentario('');
      setMotivosSelecionados([]);
      setShowAgradecimento(false);
      
      // Verificar se ainda pode avaliar quando o modal abrir
      const verificarPodeAvaliar = async () => {
        try {
          const podeAvaliar = await avaliacaoService.podeAvaliar(pedidoId);
          
          if (!podeAvaliar.canAvaliar) {
            Alert.alert(
              'Atenção',
              podeAvaliar.reason || 'Não é possível avaliar este pedido',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    onClose();
                    onSuccess(); // Atualizar a lista
                  }
                }
              ]
            );
            return;
          }
          
          if (!podeAvaliar.isWithinWindow) {
            Alert.alert(
              'Prazo expirado',
              'O prazo para avaliar este pedido expirou (30 minutos após a entrega)',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    onClose();
                  }
                }
              ]
            );
          }
        } catch (error) {
          console.error('Erro ao verificar se pode avaliar:', error);
        }
      };
      
      verificarPodeAvaliar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, pedidoId]);

  const toggleMotivo = (motivo: string) => {
    if (motivosSelecionados.includes(motivo)) {
      setMotivosSelecionados(motivosSelecionados.filter((m) => m !== motivo));
    } else {
      setMotivosSelecionados([...motivosSelecionados, motivo]);
    }
  };

  const handleEnviar = async () => {
    if (notaRestaurante === 0) {
      Alert.alert('Atenção', 'Por favor, selecione uma nota para o restaurante');
      return;
    }

    try {
      setLoading(true);

      const dados: CriarAvaliacaoData = {
        pedidoId,
        nota: notaRestaurante,
        notaEntregador: notaEntregador > 0 ? notaEntregador : undefined,
        comentario: comentario.trim() || undefined,
        motivos: motivosSelecionados,
      };

      await avaliacaoService.criar(dados);
      setShowAgradecimento(true);

      // Fechar após 2 segundos
      setTimeout(() => {
        setShowAgradecimento(false);
        onSuccess();
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('Erro ao enviar avaliação:', error);
      const errorMessage = error.response?.data?.details || error.response?.data?.error || error.message || 'Erro ao enviar avaliação. Tente novamente.';
      
      // Se o pedido já foi avaliado, fechar o modal após mostrar o erro
      if (errorMessage.includes('já foi avaliado') || errorMessage.includes('already evaluated')) {
        Alert.alert(
          'Atenção',
          'Este pedido já foi avaliado anteriormente.',
          [
            {
              text: 'OK',
              onPress: () => {
                onClose();
                onSuccess(); // Atualizar a lista para mostrar que foi avaliado
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Erro',
          errorMessage
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const getMotivosParaNota = () => {
    if (notaRestaurante >= 4) {
      return MOTIVOS_POSITIVOS;
    } else if (notaRestaurante <= 2) {
      return MOTIVOS_NEGATIVOS;
    }
    return [...MOTIVOS_POSITIVOS, ...MOTIVOS_NEGATIVOS];
  };

  const renderEstrelas = (
    nota: number,
    setNota: (nota: number) => void,
    label: string,
    obrigatorio: boolean = false
  ) => {
    return (
      <View className="mb-6">
        <Text className="text-base font-semibold text-gray-800 mb-3">
          {label}
          {obrigatorio && <Text className="text-red-500"> *</Text>}
        </Text>
        <View className="flex-row justify-center gap-2">
          {[1, 2, 3, 4, 5].map((estrela) => (
            <TouchableOpacity
              key={estrela}
              onPress={() => setNota(estrela)}
              activeOpacity={0.7}
              className="p-2"
            >
              <Ionicons
                name={estrela <= nota ? 'star' : 'star-outline'}
                size={40}
                color={estrela <= nota ? '#FFD700' : '#D1D5DB'}
              />
            </TouchableOpacity>
          ))}
        </View>
        {nota > 0 && (
          <Text className="text-center text-sm text-gray-600 mt-2">
            {nota === 5 && 'Excelente! ⭐⭐⭐⭐⭐'}
            {nota === 4 && 'Muito bom! ⭐⭐⭐⭐'}
            {nota === 3 && 'Bom ⭐⭐⭐'}
            {nota === 2 && 'Regular ⭐⭐'}
            {nota === 1 && 'Ruim ⭐'}
          </Text>
        )}
      </View>
    );
  };

  if (showAgradecimento) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-3xl p-8 items-center max-w-sm w-full">
            <View className="bg-green-100 rounded-full p-4 mb-4">
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>
            <Text className="text-2xl font-bold text-gray-800 mb-2">
              Obrigado! 🙏
            </Text>
            <Text className="text-center text-gray-600 mb-6">
              Sua avaliação ajuda a melhorar nossa qualidade
            </Text>
            <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 w-full">
              <Text className="text-center text-sm text-yellow-800">
                💰 Você ganhou um cupom de R$ 5,00 para sua próxima compra!
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  const screenHeight = Dimensions.get('window').height;
  const modalContentHeight = screenHeight * 0.85;
  const headerHeight = 80;
  const buttonHeight = 100;
  const scrollViewHeight = modalContentHeight - headerHeight - buttonHeight;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { height: modalContentHeight }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerContent}>
              {estabelecimentoImagem && (
                <View style={styles.headerImageContainer}>
                  <Image
                    source={{ uri: estabelecimentoImagem }}
                    style={styles.headerImage}
                    resizeMode="cover"
                  />
                </View>
              )}
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>
                  Avalie seu pedido
                </Text>
                <Text style={styles.headerSubtitle}>{estabelecimentoNome}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={[styles.scrollView, { height: scrollViewHeight }]}
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {/* Mensagem de impacto */}
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <Text className="text-sm text-blue-800 text-center">
                💡 Sua avaliação ajuda a melhorar sua próxima experiência
              </Text>
            </View>

            {/* Estrelas do Restaurante */}
            {renderEstrelas(notaRestaurante, setNotaRestaurante, 'Avalie o restaurante', true)}

            {/* Estrelas do Entregador (opcional) */}
            {renderEstrelas(
              notaEntregador,
              setNotaEntregador,
              'Avalie o entregador (opcional)',
              false
            )}

            {/* Motivos pré-definidos */}
            {notaRestaurante > 0 && (
              <View className="mb-6">
                <Text className="text-base font-semibold text-gray-800 mb-3">
                  O que você achou?
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {getMotivosParaNota().map((motivo) => {
                    const selecionado = motivosSelecionados.includes(motivo);
                    return (
                      <TouchableOpacity
                        key={motivo}
                        onPress={() => toggleMotivo(motivo)}
                        className={`px-4 py-2 rounded-full border-2 ${
                          selecionado
                            ? 'bg-orange-500 border-orange-500'
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        <Text
                          className={`text-sm ${
                            selecionado ? 'text-white font-semibold' : 'text-gray-700'
                          }`}
                        >
                          {motivo}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Campo de comentário */}
            {notaRestaurante > 0 && (
              <View className="mb-6">
                <Text className="text-base font-semibold text-gray-800 mb-3">
                  Comentário (opcional)
                </Text>
                <TextInput
                  value={comentario}
                  onChangeText={setComentario}
                  placeholder="Conte mais sobre sua experiência..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  className="bg-gray-50 border border-gray-300 rounded-xl p-4 text-gray-800"
                  textAlignVertical="top"
                />
              </View>
            )}
          </ScrollView>

          {/* Botão Enviar - Fixo na parte inferior */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={handleEnviar}
              disabled={loading || notaRestaurante === 0}
              style={[
                styles.submitButton,
                (loading || notaRestaurante === 0) && styles.submitButtonDisabled
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Enviar Avaliação</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flexDirection: 'column',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 12,
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 20,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    flexShrink: 0,
  },
  submitButton: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});


import React, { useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Categoria } from '../services/categoriaService';

type Restaurant = {
  id: string;
  nome: string;
  descricao?: string;
  endereco?: string;
  imagem?: string;
  tempoEntregaMin?: number;
  tempoEntregaMax?: number;
  taxaEntrega?: number;
  categorias?: Categoria[];
  diasAbertos?: number[];
  horaAbertura?: string; // HH:mm
  horaFechamento?: string; // HH:mm
  aberto?: boolean; // flag manual
};

type Variant = 'vertical' | 'horizontal';

type Props = {
  restaurant: Restaurant;
  rating?: { media?: number; count?: number };
  onPress: () => void;
  variant?: Variant;
};

const RestaurantCard: React.FC<Props> = ({ restaurant, rating, onPress, variant = 'vertical' }) => {
  const fade = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }).start();
    Animated.timing(translateY, { toValue: 0, duration: 240, useNativeDriver: true }).start();
  }, [fade, translateY]);

  const isHorizontal = variant === 'horizontal';

  const getIsOpenNow = (): { aberto: boolean; todayHours?: string } => {
    try {
      const hoje = new Date();
      const diaSemana = hoje.getDay(); // 0-6
      const dias = restaurant.diasAbertos || [];
      const abre = restaurant.horaAbertura || '';
      const fecha = restaurant.horaFechamento || '';
      const todayHours = abre && fecha ? `${abre} - ${fecha}` : undefined;
      if (!dias.length || !abre || !fecha) return { aberto: false, todayHours };
      if (!dias.includes(diaSemana)) return { aberto: false, todayHours };

      const [ah, am] = abre.split(':').map((v) => parseInt(v, 10));
      const [fh, fm] = fecha.split(':').map((v) => parseInt(v, 10));
      if ([ah, am, fh, fm].some((v) => Number.isNaN(v))) return { aberto: false, todayHours };

      const nowMinutes = hoje.getHours() * 60 + hoje.getMinutes();
      const openMinutes = ah * 60 + am;
      const closeMinutes = fh * 60 + fm;

      // Suporta virada de dia (ex: 22:00 - 02:00)
      const aberto = closeMinutes > openMinutes
        ? nowMinutes >= openMinutes && nowMinutes < closeMinutes
        : nowMinutes >= openMinutes || nowMinutes < closeMinutes;
      return { aberto, todayHours };
    } catch {
      return { aberto: false };
    }
  };

  // Prioriza a flag manual "aberto"; se ausente, usa cálculo por horário
  const schedule = getIsOpenNow();
  const aberto = typeof restaurant.aberto === 'boolean' ? restaurant.aberto : schedule.aberto;
  const todayHours = schedule.todayHours;

  const getClosedLabel = (): string | undefined => {
    const dias = restaurant.diasAbertos || [];
    const abre = restaurant.horaAbertura || '';
    const fecha = restaurant.horaFechamento || '';
    if (!dias.length || !abre || !fecha) return undefined;
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const hoje = new Date();
    const diaSemana = hoje.getDay();
    const isTodayOpenDay = dias.includes(diaSemana);
    if (isTodayOpenDay) {
      return todayHours ? `Hoje: ${todayHours}` : undefined;
    }
    for (let i = 1; i <= 7; i++) {
      const next = (diaSemana + i) % 7;
      if (dias.includes(next)) {
        return `Abre ${dayNames[next]}: ${abre} - ${fecha}`;
      }
    }
    return undefined;
  };
  const closedExtraLabel = getClosedLabel();

  return (
    <TouchableOpacity 
      activeOpacity={aberto ? 0.85 : 1}
      onPress={aberto ? onPress : undefined}
      disabled={!aberto}
      accessibilityRole="button"
      className={`bg-white rounded-2xl overflow-hidden mb-4 border border-gray-100 shadow-sm ${
        isHorizontal ? 'w-[300px] mr-3' : ''
      }`}
    >
      <Animated.View 
        className="flex-row items-center"
        style={{ opacity: fade, transform: [{ translateY }] }}
      >
        <View>
          <Image
            source={restaurant.imagem ? { uri: restaurant.imagem } : require('../assets/icon.png')}
            className={`rounded-2xl m-3 bg-gray-100 ${
              isHorizontal ? 'w-[100px] h-[100px]' : 'w-[90px] h-[90px]'
            }`}
            resizeMode="cover"
            style={{ opacity: aberto ? 1 : 0.45 }}
          />
          {!aberto && (
            <View
              pointerEvents="none"
              style={{ position: 'absolute', left: 12, top: 12, right: 12, bottom: 12, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.05)' }}
            />
          )}
        </View>

        <View className="flex-1 pr-3">
          <Text className="text-lg font-bold text-gray-800 mt-2 mb-1" numberOfLines={1}>
            {restaurant.nome}
          </Text>

          <View className="flex-row items-center mb-2">
            <View className={`px-2 py-0.5 rounded-full mr-2 ${aberto ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Text className={`text-xs font-bold ${aberto ? 'text-green-700' : 'text-gray-600'}`}>
                {aberto ? 'Aberto' : 'Fechado'}
              </Text>
            </View>
            {!aberto && closedExtraLabel && (
              <Text className="text-xs text-gray-600">{closedExtraLabel}</Text>
            )}
          </View>

          <View className="flex-row items-center flex-wrap mb-2">
            {typeof rating?.media === 'number' && (
              <View className="flex-row items-center mr-3">
                <Ionicons name="star" size={14} color="#fbbf24" />
                <Text className="text-sm font-semibold text-red-600 ml-0.5">
                  {rating.media.toFixed(1)}
                </Text>
                {rating.count && (
                  <Text className="text-xs text-gray-500 ml-1">
                    ({rating.count})
                  </Text>
                )}
              </View>
            )}
            <View className="flex-row items-center mr-3">
              <Ionicons name="time-outline" size={14} color="#ea1d2c" />
              <Text className="text-sm font-semibold text-red-600 ml-1">
                {restaurant.tempoEntregaMin ?? '-'} - {restaurant.tempoEntregaMax ?? '-'} min
              </Text>
            </View>
            {typeof restaurant.taxaEntrega === 'number' && (
              <Text className="text-sm font-semibold text-red-600">
                • R$ {restaurant.taxaEntrega.toFixed(2)}
              </Text>
            )}
          </View>

          {!!restaurant.categorias && restaurant.categorias.length > 0 && (
            <View className="flex-row flex-wrap">
              {restaurant.categorias.map((cat) => (
                <Text 
                  key={cat.id} 
                  className="text-xs text-blue-600 font-semibold mr-2 mb-1"
                >
                  {cat.nome}
                </Text>
              ))}
            </View>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default RestaurantCard;



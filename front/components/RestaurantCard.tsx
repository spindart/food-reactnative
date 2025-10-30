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

  return (
    <TouchableOpacity 
      activeOpacity={0.85} 
      onPress={onPress} 
      accessibilityRole="button"
      className={`bg-white rounded-2xl overflow-hidden mb-4 border border-gray-100 shadow-sm ${
        isHorizontal ? 'w-[300px] mr-3' : ''
      }`}
    >
      <Animated.View 
        className="flex-row items-center"
        style={{ opacity: fade, transform: [{ translateY }] }}
      >
        <Image
          source={restaurant.imagem ? { uri: restaurant.imagem } : require('../assets/icon.png')}
          className={`rounded-2xl m-3 bg-gray-100 ${
            isHorizontal ? 'w-[100px] h-[100px]' : 'w-[90px] h-[90px]'
          }`}
          resizeMode="cover"
        />

        <View className="flex-1 pr-3">
          <Text className="text-lg font-bold text-gray-800 mt-2 mb-1" numberOfLines={1}>
            {restaurant.nome}
          </Text>

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



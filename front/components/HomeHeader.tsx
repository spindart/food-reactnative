import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  search: string;
  onChangeSearch: (t: string) => void;
  locationText?: string;
  showLocation?: boolean;
};

const HomeHeader: React.FC<Props> = ({ search, onChangeSearch, locationText = 'Entregar em Minha Localização', showLocation = false }) => {
  return (
    <View className="bg-white px-4 pt-3 pb-2 shadow-sm">
      {showLocation && (
        <View className="flex-row items-center mb-2.5">
          <Ionicons name="location" size={18} color="#ea1d2c" />
          <Text className="ml-1.5 text-gray-800 font-semibold" numberOfLines={1}>{locationText}</Text>
        </View>
      )}
      <View className="flex-row items-center bg-gray-50 rounded-2xl py-2.5 px-3 border border-gray-200">
        <Ionicons name="search" size={18} color="#999" />
        <TextInput
          className="ml-2 flex-1 text-gray-800"
          placeholder="Buscar estabelecimento ou item"
          placeholderTextColor="#aaa"
          value={search}
          onChangeText={onChangeSearch}
          accessibilityLabel="Campo de busca"
          returnKeyType="search"
        />
      </View>
    </View>
  );
};

export default HomeHeader;



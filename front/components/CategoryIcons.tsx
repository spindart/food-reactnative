import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Categoria } from '../services/categoriaService';

type Props = {
  categorias: Categoria[];
  selected?: string;
  onSelect?: (nome: string) => void;
};

const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  Restaurante: 'fast-food',
  Lanches: 'pizza',
  Bebidas: 'wine',
  Sobremesas: 'ice-cream',
  Pizza: 'pizza',
  Japonesa: 'fish',
  Saudável: 'leaf',
  Mercado: 'storefront',
};

const CategoryIcons: React.FC<Props> = ({ categorias, selected, onSelect }) => {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      className="px-3 pb-2"
      contentContainerStyle={{ paddingRight: 16 }}
    >
      {categorias.map((cat) => {
        const isSelected = selected === cat.nome;
        const icon = Object.keys(iconMap).find(key => cat.nome.includes(key)) 
          ? iconMap[Object.keys(iconMap).find(key => cat.nome.includes(key))!]
          : 'pricetag';
        
        return (
          <TouchableOpacity
            key={cat.id}
            className="items-center mr-3"
            style={{ minWidth: 72 }}
            onPress={() => onSelect && onSelect(cat.nome)}
            activeOpacity={0.8}
          >
            <View 
              className={`w-14 h-14 rounded-full items-center justify-center mb-1.5 ${
                isSelected 
                  ? 'bg-red-600 border-red-600' 
                  : 'bg-white border border-gray-200'
              }`}
            >
              <Ionicons 
                name={icon as any} 
                size={22} 
                color={isSelected ? '#fff' : '#ea1d2c'} 
              />
            </View>
            <Text 
              className={`text-xs text-center ${
                isSelected ? 'font-semibold text-gray-800' : 'text-gray-600'
              }`}
              numberOfLines={2}
            >
              {cat.nome}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

export default CategoryIcons;



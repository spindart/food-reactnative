import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

const categories = [
  { key: 'lanches', label: 'Lanches' },
  { key: 'bebidas', label: 'Bebidas' },
  { key: 'sobremesas', label: 'Sobremesas' },
  { key: 'pizza', label: 'Pizza' },
  { key: 'japonesa', label: 'Japonesa' },
  { key: 'saudavel', label: 'Saudável' },
];

const CategoryBar: React.FC<{ selected: string; onSelect: (key: string) => void }> = ({ selected, onSelect }) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {categories.map((cat) => (
        <TouchableOpacity
          key={cat.key}
          style={[styles.category, selected === cat.key && styles.selected]}
          onPress={() => onSelect(cat.key)}
          activeOpacity={0.7}
        >
          <Text style={[styles.label, selected === cat.key && styles.selectedLabel]}>{cat.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    paddingLeft: 8,
  },
  category: {
    backgroundColor: '#f6f6f6',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  selected: {
    backgroundColor: '#e5293e',
    borderColor: '#e5293e',
  },
  label: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 15,
  },
  selectedLabel: {
    color: '#fff',
  },
});

export default CategoryBar;

import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';

type EvaluationFormProps = {
  onSubmit: (nota: number, comentario: string) => void;
};

const EvaluationForm: React.FC<EvaluationFormProps> = ({ onSubmit }) => {
  const [nota, setNota] = useState<number>(0);
  const [comentario, setComentario] = useState<string>('');

  const handleSubmit = () => {
    if (nota >= 0 && nota <= 5) {
      onSubmit(nota, comentario);
      setNota(0);
      setComentario('');
    } else {
      alert('A nota deve estar entre 0 e 5.');
    }
  };

  return (
    <View className="mt-2">
      <TextInput
        className="bg-gray-50 rounded-lg p-2.5 mb-2.5 border border-gray-300 text-sm text-gray-800"
        placeholder="Nota (0-5)"
        placeholderTextColor="#aaa"
        keyboardType="numeric"
        value={nota.toString()}
        onChangeText={(text) => setNota(Number(text))}
      />
      <TextInput
        className="bg-gray-50 rounded-lg p-2.5 mb-2.5 border border-gray-300 text-sm text-gray-800"
        placeholder="Comentário"
        placeholderTextColor="#aaa"
        value={comentario}
        onChangeText={setComentario}
        multiline
      />
      <TouchableOpacity 
        onPress={handleSubmit} 
        className="bg-red-600 p-2.5 rounded-lg items-center"
        activeOpacity={0.8}
      >
        <Text className="text-white text-base font-bold">Enviar Avaliação</Text>
      </TouchableOpacity>
    </View>
  );
};

export default EvaluationForm;

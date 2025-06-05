import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';

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
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Nota (0-5)"
        keyboardType="numeric"
        value={nota.toString()}
        onChangeText={(text) => setNota(Number(text))}
      />
      <TextInput
        style={styles.input}
        placeholder="Comentário"
        value={comentario}
        onChangeText={setComentario}
      />
      <TouchableOpacity onPress={handleSubmit} style={styles.button}>
        <Text style={styles.buttonText}>Enviar Avaliação</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 14,
    color: '#333',
  },
  button: {
    backgroundColor: '#e5293e',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EvaluationForm;

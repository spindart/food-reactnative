import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createProduto } from '../services/produtoService';
import { Snackbar } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';

const CadastrarProdutoScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { estabelecimento } = route.params;
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [imagem, setImagem] = useState<string>('');
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImagem(result.assets[0].base64 ? `data:image/jpeg;base64,${result.assets[0].base64}` : result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!nome || !descricao || !preco) {
      setSnackbar({ visible: true, message: 'Preencha todos os campos.', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      await createProduto({ nome, descricao, preco: parseFloat(preco), estabelecimentoId: estabelecimento.id, imagem });
      setSnackbar({ visible: true, message: 'Produto cadastrado com sucesso!', type: 'success' });
      setTimeout(() => {
        setSnackbar((prev) => ({ ...prev, visible: false }));
        navigation.goBack();
      }, 1500);
    } catch (error) {
      setSnackbar({ visible: true, message: 'Erro ao cadastrar produto.', type: 'error' });
      setTimeout(() => setSnackbar((prev) => ({ ...prev, visible: false })), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cadastrar Produto</Text>
      <Text style={styles.label}>Estabelecimento: {estabelecimento.nome}</Text>
      <TextInput
        style={styles.input}
        placeholder="Nome"
        value={nome}
        onChangeText={setNome}
      />
      <TextInput
        style={styles.input}
        placeholder="Descrição"
        value={descricao}
        onChangeText={setDescricao}
      />
      <TextInput
        style={styles.input}
        placeholder="Preço"
        value={preco}
        onChangeText={setPreco}
        keyboardType="decimal-pad"
      />
      <View style={{ alignItems: 'center', marginBottom: 12 }}>
        {imagem ? (
          <Image source={{ uri: imagem }} style={{ width: 120, height: 120, borderRadius: 12, marginBottom: 8 }} />
        ) : (
          <View style={{ width: 120, height: 120, borderRadius: 12, backgroundColor: '#eee', marginBottom: 8, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#aaa' }}>Sem imagem</Text>
          </View>
        )}
        <TouchableOpacity style={[styles.button, { backgroundColor: '#6c63ff', marginBottom: 0 }]} onPress={pickImage}>
          <Text style={styles.buttonText}>Selecionar Imagem</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Cadastrando...' : 'Cadastrar'}</Text>
      </TouchableOpacity>
      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar((prev) => ({ ...prev, visible: false }))}
        duration={1500}
        style={{ backgroundColor: snackbar.type === 'success' ? '#4BB543' : '#D32F2F', marginBottom: 16 }}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  label: { fontSize: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 12, marginBottom: 8 },
  button: { backgroundColor: '#007BFF', padding: 12, borderRadius: 4, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default CadastrarProdutoScreen;

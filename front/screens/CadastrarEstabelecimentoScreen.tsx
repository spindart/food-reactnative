import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createEstabelecimento } from '../services/estabelecimentoService';
import { Snackbar } from 'react-native-paper';
import { getCategorias, Categoria } from '../services/categoriaService';
import * as ImagePicker from 'expo-image-picker';

const CadastrarEstabelecimentoScreen: React.FC = () => {
  const navigation = useNavigation();
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [endereco, setEndereco] = useState('');
  const [tempoEntregaMin, setTempoEntregaMin] = useState('30');
  const [tempoEntregaMax, setTempoEntregaMax] = useState('50');
  const [taxaEntrega, setTaxaEntrega] = useState('5.00');
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>([]);
  const [imagem, setImagem] = useState<string>('');

  React.useEffect(() => {
    getCategorias().then(setCategorias);
  }, []);

  const handleToggleCategoria = (id: string) => {
    setCategoriasSelecionadas((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length < 3) return [...prev, id];
      return prev;
    });
  };

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
    if (!nome || !descricao || !endereco) {
      setSnackbar({ visible: true, message: 'Preencha todos os campos.', type: 'error' });
      return;
    }
    if (categoriasSelecionadas.length === 0) {
      setSnackbar({ visible: true, message: 'Selecione pelo menos uma categoria.', type: 'error' });
      return;
    }
    if (!imagem) {
      setSnackbar({ visible: true, message: 'Selecione uma imagem.', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      await createEstabelecimento({
        nome,
        descricao,
        endereco,
        tempoEntregaMin: Number(tempoEntregaMin),
        tempoEntregaMax: Number(tempoEntregaMax),
        taxaEntrega: Number(taxaEntrega),
        categorias: categorias.filter((c) => categoriasSelecionadas.includes(c.id)),
        imagem,
      });
      setSnackbar({ visible: true, message: 'Estabelecimento cadastrado com sucesso!', type: 'success' });
      setTimeout(() => {
        setSnackbar((prev) => ({ ...prev, visible: false }));
        navigation.goBack();
      }, 1500);
    } catch (error) {
      setSnackbar({ visible: true, message: 'Erro ao cadastrar estabelecimento.', type: 'error' });
      setTimeout(() => setSnackbar((prev) => ({ ...prev, visible: false })), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cadastrar Estabelecimento</Text>
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
        placeholder="Endereço"
        value={endereco}
        onChangeText={setEndereco}
      />
      <TextInput
        style={styles.input}
        placeholder="Tempo de entrega mínimo (min)"
        value={tempoEntregaMin}
        onChangeText={setTempoEntregaMin}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Tempo de entrega máximo (min)"
        value={tempoEntregaMax}
        onChangeText={setTempoEntregaMax}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Taxa de entrega (R$)"
        value={taxaEntrega}
        onChangeText={setTaxaEntrega}
        keyboardType="numeric"
      />
      {/* Seleção de categorias dinâmicas */}
      <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Categorias (até 3):</Text>
      <View style={{ maxHeight: 180 }}>
        <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {categorias.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={{
                backgroundColor: categoriasSelecionadas.includes(cat.id) ? '#e5293e' : '#f6f6f6',
                borderRadius: 18,
                paddingVertical: 8,
                paddingHorizontal: 16,
                marginRight: 8,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: categoriasSelecionadas.includes(cat.id) ? '#e5293e' : '#eee',
              }}
              onPress={() => handleToggleCategoria(cat.id)}
              activeOpacity={0.7}
            >
              <Text style={{ color: categoriasSelecionadas.includes(cat.id) ? '#fff' : '#222', fontWeight: 'bold' }}>{cat.nome}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {/* Seleção de imagem */}
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
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 12, marginBottom: 8 },
  button: { backgroundColor: '#007BFF', padding: 12, borderRadius: 4, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default CadastrarEstabelecimentoScreen;

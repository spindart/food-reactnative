import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { updateEstabelecimento } from '../services/estabelecimentoService';
import { Snackbar } from 'react-native-paper';
import { getCategorias, Categoria } from '../services/categoriaService';

const EditarEstabelecimentoScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { estabelecimento } = route.params;
  const [nome, setNome] = useState(estabelecimento.nome);
  const [descricao, setDescricao] = useState(estabelecimento.descricao);
  const [endereco, setEndereco] = useState(estabelecimento.endereco);
  const [tempoEntregaMin, setTempoEntregaMin] = useState(estabelecimento.tempoEntregaMin?.toString() || '30');
  const [tempoEntregaMax, setTempoEntregaMax] = useState(estabelecimento.tempoEntregaMax?.toString() || '50');
  const [taxaEntrega, setTaxaEntrega] = useState(estabelecimento.taxaEntrega?.toString() || '5.00');
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>(estabelecimento.categorias ? estabelecimento.categorias.map((c: Categoria) => c.id) : []);

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

  const handleSubmit = async () => {
    if (!nome || !descricao || !endereco) {
      setSnackbar({ visible: true, message: 'Preencha todos os campos.', type: 'error' });
      return;
    }
    if (categoriasSelecionadas.length === 0) {
      setSnackbar({ visible: true, message: 'Selecione pelo menos uma categoria.', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      await updateEstabelecimento(estabelecimento.id, {
        nome,
        descricao,
        endereco,
        tempoEntregaMin: Number(tempoEntregaMin),
        tempoEntregaMax: Number(tempoEntregaMax),
        taxaEntrega: Number(taxaEntrega),
        categorias: categorias.filter((c) => categoriasSelecionadas.includes(c.id)),
      });
      setSnackbar({ visible: true, message: 'Estabelecimento atualizado com sucesso!', type: 'success' });
      setTimeout(() => {
        setSnackbar((prev) => ({ ...prev, visible: false }));
        navigation.goBack();
      }, 1500);
    } catch (error) {
      setSnackbar({ visible: true, message: 'Erro ao atualizar estabelecimento.', type: 'error' });
      setTimeout(() => setSnackbar((prev) => ({ ...prev, visible: false })), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Editar Estabelecimento</Text>
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
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
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
      </View>
      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Salvando...' : 'Salvar'}</Text>
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

export default EditarEstabelecimentoScreen;

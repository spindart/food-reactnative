import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { updateEstabelecimento, Estabelecimento } from '../services/estabelecimentoService';
import { Snackbar } from 'react-native-paper';
import { getCategorias, Categoria } from '../services/categoriaService';
import AddressInput from '../components/AddressInput';
import { AddressSuggestion } from '../services/geolocationService';

const EditarEstabelecimentoScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { estabelecimento } = route.params;
  const [nome, setNome] = useState(estabelecimento.nome);
  const [descricao, setDescricao] = useState(estabelecimento.descricao);
  const [endereco, setEndereco] = useState(estabelecimento.endereco);
  const [latitude, setLatitude] = useState<number | null>(estabelecimento.latitude);
  const [longitude, setLongitude] = useState<number | null>(estabelecimento.longitude);
  const [tempoEntregaMin, setTempoEntregaMin] = useState(estabelecimento.tempoEntregaMin?.toString() || '30');
  const [tempoEntregaMax, setTempoEntregaMax] = useState(estabelecimento.tempoEntregaMax?.toString() || '50');
  const [taxaEntrega, setTaxaEntrega] = useState(estabelecimento.taxaEntrega?.toString() || '5.00');
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>(estabelecimento.categorias ? estabelecimento.categorias.map((c: Categoria) => c.id) : []);
  const [diasAbertos, setDiasAbertos] = useState<number[]>(estabelecimento.diasAbertos || [1,2,3,4,5]);
  const [horaAbertura, setHoraAbertura] = useState<string>(estabelecimento.horaAbertura || '09:00');
  const [horaFechamento, setHoraFechamento] = useState<string>(estabelecimento.horaFechamento || '18:00');

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

  const handleAddressSelect = (address: AddressSuggestion) => {
    setLatitude(address.latitude);
    setLongitude(address.longitude);
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
      const payload: Estabelecimento = {
        nome,
        descricao,
        endereco,
        latitude,
        longitude,
        tempoEntregaMin: Number(tempoEntregaMin),
        tempoEntregaMax: Number(tempoEntregaMax),
        taxaEntrega: Number(taxaEntrega),
        categorias: categorias.filter((c) => categoriasSelecionadas.includes(c.id)),
        diasAbertos,
        horaAbertura,
        horaFechamento,
      };
      await updateEstabelecimento(estabelecimento.id, payload);
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
    categorias.length === 0 ? (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#e5293e" />
        <Text style={{ marginTop: 12, color: '#888' }}>Carregando categorias...</Text>
      </View>
    ) : (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
        <AddressInput
          label="Endereço do Estabelecimento"
          placeholder="Digite o endereço do estabelecimento"
          value={endereco}
          onChangeText={setEndereco}
          onAddressSelect={handleAddressSelect}
          required
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
        <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Dias e horário de funcionamento</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
          {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((label, idx) => (
            <TouchableOpacity
              key={label}
              onPress={() => setDiasAbertos((prev) => prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx])}
              style={{
                backgroundColor: diasAbertos.includes(idx) ? '#e5293e' : '#f6f6f6',
                borderRadius: 18,
                paddingVertical: 6,
                paddingHorizontal: 12,
                marginRight: 8,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: diasAbertos.includes(idx) ? '#e5293e' : '#eee',
              }}
              activeOpacity={0.7}
            >
              <Text style={{ color: diasAbertos.includes(idx) ? '#fff' : '#222', fontWeight: 'bold' }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Abertura (HH:mm)"
            value={horaAbertura}
            onChangeText={setHoraAbertura}
            keyboardType="numbers-and-punctuation"
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Fechamento (HH:mm)"
            value={horaFechamento}
            onChangeText={setHoraFechamento}
            keyboardType="numbers-and-punctuation"
          />
        </View>
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
        >
          {snackbar.message}
        </Snackbar>
      </ScrollView>
    )
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'flex-start', padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 12, marginBottom: 8 },
  button: { backgroundColor: '#007BFF', padding: 12, borderRadius: 4, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default EditarEstabelecimentoScreen;

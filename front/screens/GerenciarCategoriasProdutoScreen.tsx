import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, StyleSheet, Modal } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { listProdutoCategorias, createProdutoCategoria, updateProdutoCategoria, deleteProdutoCategoria, ProdutoCategoria } from '../services/produtoCategoriaService';

const GerenciarCategoriasProdutoScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { estabelecimento } = route.params; // espera { estabelecimento: { id, nome } }

  const [categorias, setCategorias] = useState<ProdutoCategoria[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [nome, setNome] = useState('');
  const [ordem, setOrdem] = useState('0');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await listProdutoCategorias(estabelecimento.id);
      setCategorias(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setNome('');
    setOrdem('0');
    setModalVisible(true);
  };

  const saveNew = async () => {
    const trimmed = nome.trim();
    if (!trimmed) {
      Alert.alert('Atenção', 'Informe o nome da categoria.');
      return;
    }
    setSaving(true);
    try {
      const ordNum = Number(ordem);
      await createProdutoCategoria(estabelecimento.id, { nome: trimmed, ordem: Number.isFinite(ordNum) ? ordNum : 0 });
      setModalVisible(false);
      await load();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível criar a categoria.');
    } finally {
      setSaving(false);
    }
  };

  const updateItem = async (cat: ProdutoCategoria) => {
    try {
      await updateProdutoCategoria(estabelecimento.id, cat.id, { nome: cat.nome, ordem: cat.ordem ?? 0 });
      await load();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar a categoria.');
    }
  };

  const removeItem = async (cat: ProdutoCategoria) => {
    Alert.alert('Remover', `Excluir "${cat.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: async () => {
        try {
          await deleteProdutoCategoria(estabelecimento.id, cat.id);
          await load();
        } catch (e) {
          Alert.alert('Erro', 'Não foi possível remover. Verifique se há produtos usando esta categoria.');
        }
      }}
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Categorias de {estabelecimento.nome}</Text>

      <TouchableOpacity style={[styles.button, { alignSelf: 'flex-start', marginBottom: 12 }]} onPress={openCreate}>
        <Text style={styles.buttonText}>Nova categoria</Text>
      </TouchableOpacity>

      {loading ? (
        <Text>Carregando...</Text>
      ) : (
        <FlatList
          data={categorias}
          keyExtractor={(item) => String(item.id)}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <View style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12 }}>
              <Text style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>ID: {item.id}</Text>
              <TextInput
                style={styles.input}
                value={item.nome}
                onChangeText={(t) => setCategorias((prev) => prev.map((c) => (c.id === item.id ? { ...c, nome: t } : c)))}
                placeholder="Nome"
              />
              <TextInput
                style={styles.input}
                value={String(item.ordem ?? 0)}
                keyboardType="number-pad"
                onChangeText={(t) => setCategorias((prev) => prev.map((c) => (c.id === item.id ? { ...c, ordem: Number(t) || 0 } : c)))}
                placeholder="Ordem"
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <TouchableOpacity style={[styles.button, { backgroundColor: '#9ca3af', marginRight: 8 }]} onPress={() => removeItem(item)}>
                  <Text style={styles.buttonText}>Remover</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => updateItem(item)}>
                  <Text style={styles.buttonText}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Modal transparent visible={modalVisible} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View style={{ backgroundColor: '#fff', width: '100%', maxWidth: 420, borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Nova categoria</Text>
            <TextInput style={[styles.input, { marginBottom: 8 }]} placeholder="Nome" value={nome} onChangeText={setNome} />
            <TextInput style={[styles.input, { marginBottom: 12 }]} placeholder="Ordem" value={ordem} keyboardType="number-pad" onChangeText={setOrdem} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity style={[styles.button, { backgroundColor: '#9ca3af', marginRight: 8 }]} onPress={() => setModalVisible(false)}>
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={saveNew} disabled={saving}>
                <Text style={styles.buttonText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 8 },
  button: { backgroundColor: '#007BFF', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});

export default GerenciarCategoriasProdutoScreen;



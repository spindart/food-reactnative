import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Modal, TextInput } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { getMeusEstabelecimentos, deleteEstabelecimento } from '../services/estabelecimentoService';
import { Snackbar } from 'react-native-paper';

type Estabelecimento = {
  id: string;
  nome: string;
  descricao: string;
  endereco: string;
};

const DonoDashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: '' });
  const [showModal, setShowModal] = useState(false);
  const [senha, setSenha] = useState('');
  const [removerId, setRemoverId] = useState<string | null>(null);
  const [removerLoading, setRemoverLoading] = useState(false);

  useEffect(() => {
    const fetchEstabelecimentos = async () => {
      try {
        const data = await getMeusEstabelecimentos();
        setEstabelecimentos(data);
      } catch (err) {
        setError('Erro ao carregar estabelecimentos.');
      } finally {
        setLoading(false);
      }
    };
    if (isFocused) {
      setLoading(true);
      fetchEstabelecimentos();
    }
  }, [isFocused]);

  const handleRemover = async () => {
    if (!removerId) return;
    setRemoverLoading(true);
    try {
      // Aqui você pode validar a senha no backend se desejar
      await deleteEstabelecimento(removerId);
      setEstabelecimentos((prev) => prev.filter((e) => e.id !== removerId));
      setSnackbar({ visible: true, message: 'Estabelecimento removido com sucesso!', type: 'success' });
      setShowModal(false);
      setSenha('');
      setRemoverId(null);
    } catch (error) {
      setError('Erro ao remover estabelecimento.');
      setTimeout(() => setError(null), 2000);
    } finally {
      setRemoverLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Painel do Dono</Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('CadastrarEstabelecimento' as never)}>
        <Text style={styles.buttonText}>Cadastrar Novo Estabelecimento</Text>
      </TouchableOpacity>
      {loading ? (
        <Text>Carregando...</Text>
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={estabelecimentos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.nome}</Text>
              <Text style={styles.desc}>{item.descricao}</Text>
              <Text style={styles.address}>{item.endereco}</Text>
              <TouchableOpacity style={[styles.button, { backgroundColor: '#FFA500', marginTop: 8 }]} onPress={() => navigation.navigate('EditarEstabelecimento' as never, { estabelecimento: item } as never)}>
                <Text style={styles.buttonText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.removeButton]} onPress={() => { setRemoverId(item.id); setShowModal(true); }}>
                <Text style={styles.removeButtonText}>Remover</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { backgroundColor: '#28a745', marginTop: 8 }]} onPress={() => navigation.navigate('CadastrarProduto' as never, { estabelecimento: item } as never)}>
                <Text style={styles.buttonText}>Cadastrar Produto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { backgroundColor: '#007BFF', marginTop: 8 }]} onPress={() => navigation.navigate('ProdutosDoEstabelecimento' as never, { estabelecimento: item } as never)}>
                <Text style={styles.buttonText}>Ver Produtos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { backgroundColor: '#6c63ff', marginTop: 8 }]} onPress={() => navigation.navigate('PedidosDoEstabelecimento' as never, { estabelecimento: item } as never)}>
                <Text style={styles.buttonText}>Ver Pedidos</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar((prev) => ({ ...prev, visible: false }))}
        duration={1500}
        style={{ backgroundColor: snackbar.type === 'success' ? '#4BB543' : '#D32F2F', marginBottom: 16 }}
      >
        {snackbar.message}
      </Snackbar>
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>Confirme a remoção</Text>
            <Text style={{ marginBottom: 12 }}>Digite sua senha para remover o estabelecimento:</Text>
            <TextInput
              style={styles.input}
              placeholder="Senha"
              secureTextEntry
              value={senha}
              onChangeText={setSenha}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <TouchableOpacity style={[styles.button, { backgroundColor: '#aaa', flex: 1, marginRight: 8 }]} onPress={() => setShowModal(false)}>
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { backgroundColor: '#D32F2F', flex: 1, opacity: senha ? 1 : 0.5 }]} onPress={handleRemover} disabled={!senha || removerLoading}>
                <Text style={styles.buttonText}>{removerLoading ? 'Removendo...' : 'Confirmar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  button: { backgroundColor: '#007BFF', padding: 12, borderRadius: 4, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  card: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 16, marginBottom: 12 },
  name: { fontSize: 18, fontWeight: 'bold' },
  desc: { fontSize: 14, color: '#666' },
  address: { fontSize: 14, color: '#888' },
  errorText: { color: 'red', fontSize: 14 },
  removeButton: {
    backgroundColor: '#D32F2F',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'flex-end',
    opacity: 0.5,
    minWidth: 80,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: 320,
    alignItems: 'center',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    width: '100%',
    marginBottom: 16,
  },
});

export default DonoDashboardScreen;

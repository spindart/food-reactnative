import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, Platform, Modal, Pressable } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createProduto } from '../services/produtoService';
import { listProdutoCategorias, createProdutoCategoria, ProdutoCategoria } from '../services/produtoCategoriaService';
import { Snackbar } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const CadastrarProdutoScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { estabelecimento } = route.params;
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [imagem, setImagem] = useState<string>('');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [categorias, setCategorias] = useState<ProdutoCategoria[]>([]);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('');
  const [novaCategoriaOrdem, setNovaCategoriaOrdem] = useState('0');
  const [criandoCategoria, setCriandoCategoria] = useState(false);
  const [modalCategoriaVisivel, setModalCategoriaVisivel] = useState(false);
  React.useEffect(() => {
    const fetchCats = () => {
      listProdutoCategorias(estabelecimento.id).then((cats) => {
        setCategorias(cats);
        if (cats.length > 0) {
          // mantém seleção se ainda existir; senão, seleciona a primeira
          if (!categoriaId || !cats.some((c) => c.id === categoriaId)) {
            setCategoriaId(cats[0].id);
          }
        } else {
          setCategoriaId(null);
        }
      }).catch(() => {});
    };
    fetchCats();
    const unsubscribe = (navigation as any).addListener('focus', fetchCats);
    return unsubscribe;
  }, [estabelecimento.id, navigation]);

  const handleCriarCategoria = async () => {
    const nome = (novaCategoriaNome || '').trim();
    if (!nome) {
      setSnackbar({ visible: true, message: 'Informe o nome da categoria.', type: 'error' });
      return;
    }
    try {
      setCriandoCategoria(true);
      const ordemNum = Number(novaCategoriaOrdem);
      const criada = await createProdutoCategoria(estabelecimento.id, { nome, ordem: Number.isFinite(ordemNum) ? ordemNum : 0 });
      // Atualiza lista e seleciona nova
      const atualizadas = await listProdutoCategorias(estabelecimento.id);
      setCategorias(atualizadas);
      setCategoriaId(criada.id);
      setNovaCategoriaNome('');
      setNovaCategoriaOrdem('0');
      setModalCategoriaVisivel(false);
      setSnackbar({ visible: true, message: 'Categoria criada!', type: 'success' });
    } catch (e) {
      setSnackbar({ visible: true, message: 'Erro ao criar categoria.', type: 'error' });
    } finally {
      setCriandoCategoria(false);
    }
  };

  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permissão necessária', 'Precisamos de acesso às suas fotos para selecionar a imagem do produto.');
          return;
        }
      }
    const mediaTypes: any = (ImagePicker as any).MediaType?.Images || (ImagePicker as any).MediaTypeOptions?.Images;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const guessMimeFromUri = (uri: string | undefined) => {
        if (!uri) return 'image/jpeg';
        const u = uri.toLowerCase();
        if (u.endsWith('.png')) return 'image/png';
        if (u.endsWith('.webp')) return 'image/webp';
        if (u.endsWith('.jpg') || u.endsWith('.jpeg')) return 'image/jpeg';
        return 'image/jpeg';
      };
      const mime = (asset as any).mimeType || guessMimeFromUri(asset.uri);
      if (asset.base64 && asset.base64.length > 0) {
        setImagem(`data:${mime};base64,${asset.base64}`);
        return;
      }
      // Garantir base64 mesmo quando a lib não retorna base64
      if (asset.uri) {
        try {
          const b64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
          setImagem(`data:${mime};base64,${b64}`);
        } catch (e) {
          // fallback: mantém vazio para evitar salvar file:// que não renderiza depois
          setImagem('');
        }
      }
    }
    } catch (err: any) {
      console.error('ImagePicker error:', err);
      Alert.alert('Erro', `Não foi possível abrir a galeria.${err?.message ? `\n${err.message}` : ''}`);
    }
  };

  const handleSubmit = async () => {
    if (!nome || !preco) {
      setSnackbar({ visible: true, message: 'Preencha todos os campos obrigatórios.', type: 'error' });
      return;
    }
    if (!categoriaId) {
      setSnackbar({ visible: true, message: 'Selecione uma categoria do produto.', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      await createProduto({ nome, descricao, preco: parseFloat(preco), estabelecimentoId: estabelecimento.id, imagem, produtoCategoriaId: categoriaId });
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
        placeholder="Descrição (opcional)"
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
      <Text style={styles.label}>Categoria *</Text>
      <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 4, marginBottom: 8, overflow: 'hidden' }}>
        {categorias && categorias.length > 0 ? (
          <Picker
            selectedValue={categoriaId ?? undefined}
            onValueChange={(itemValue) => setCategoriaId(itemValue)}
            style={{ backgroundColor: '#fff' }}
            itemStyle={{ fontWeight: 'bold' }}
          >
            {categorias.map((cat) => (
              <Picker.Item key={cat.id} label={cat.nome} value={cat.id} />
            ))}
          </Picker>
        ) : (
          <Text style={{ color: '#e11d48', padding: 10 }}>Nenhuma categoria disponível. Toque em "Gerenciar categorias" para criar.</Text>
        )}
      </View>
      {(!categoriaId) && (
        <Text style={{ color: '#e11d48', fontSize: 12, marginTop: -4, marginBottom: 8 }}>Campo obrigatório</Text>
      )}


      {/* Botão para gerenciar categorias (nome/ordem) */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#0ea5e9' }]}
        onPress={() => (navigation as any).navigate('GerenciarCategoriasProduto', { estabelecimento: { id: estabelecimento.id, nome: estabelecimento.nome } })}
      >
        <Text style={styles.buttonText}>Gerenciar categorias</Text>
      </TouchableOpacity>

      {/* Modal de Nova Categoria */}
      <Modal transparent visible={modalCategoriaVisivel} animationType="fade" onRequestClose={() => setModalCategoriaVisivel(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View style={{ backgroundColor: '#fff', width: '100%', maxWidth: 420, borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Nova categoria de produto</Text>
            <TextInput
              style={[styles.input, { marginBottom: 8 }]}
              placeholder="Nome (ex: Bebidas)"
              value={novaCategoriaNome}
              onChangeText={setNovaCategoriaNome}
            />
            <TextInput
              style={[styles.input, { marginBottom: 12 }]}
              placeholder="Ordem (0 = primeiro)"
              keyboardType="number-pad"
              value={novaCategoriaOrdem}
              onChangeText={setNovaCategoriaOrdem}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Pressable onPress={() => setModalCategoriaVisivel(false)} style={[styles.button, { backgroundColor: '#9ca3af', marginRight: 8 }]}>
                <Text style={styles.buttonText}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={handleCriarCategoria} disabled={criandoCategoria} style={[styles.button]}>
                <Text style={styles.buttonText}>{criandoCategoria ? 'Salvando...' : 'Salvar'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
      <TouchableOpacity style={[styles.button, (!categoriaId || categorias.length === 0) ? { opacity: 0.6 } : null]} onPress={handleSubmit} disabled={loading || !categoriaId || categorias.length === 0}>
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

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Modal, Pressable, ScrollView, TextInput } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getProdutoByEstabelecimento } from '../services/produtoService';
import FloatingCartButton from '../components/FloatingCartButton';
import { useCart } from '../context/CartContext';

const categorias = [
  { key: 'lanches', label: 'Lanches' },
  { key: 'bebidas', label: 'Bebidas' },
  { key: 'sobremesas', label: 'Sobremesas' },
  { key: 'pizza', label: 'Pizza' },
  { key: 'japonesa', label: 'Japonesa' },
  { key: 'saudavel', label: 'Saudável' },
];

const ProdutosDoEstabelecimentoScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { estabelecimento } = route.params;
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState('lanches');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalProduto, setModalProduto] = useState<any | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState('');
  const { state: cartState } = useCart();

  useEffect(() => {
    const fetchProdutos = async () => {
      try {
        const data = await getProdutoByEstabelecimento(estabelecimento.id);
        setProdutos(data);
      } catch (err) {
        setError('Erro ao carregar produtos.');
      } finally {
        setLoading(false);
      }
    };
    fetchProdutos();
  }, [estabelecimento.id]);

  const filtered = produtos.filter((p) => {
    if (selectedCategoria === 'lanches') return true;
    if (selectedCategoria === 'bebidas') return p.nome.toLowerCase().includes('bebida');
    if (selectedCategoria === 'sobremesas') return p.nome.toLowerCase().includes('sobremesa');
    if (selectedCategoria === 'pizza') return p.nome.toLowerCase().includes('pizza');
    if (selectedCategoria === 'japonesa') return p.nome.toLowerCase().includes('sushi') || p.nome.toLowerCase().includes('japonesa');
    if (selectedCategoria === 'saudavel') return p.nome.toLowerCase().includes('salada') || p.nome.toLowerCase().includes('saudável');
    return true;
  });

  const openModal = (produto: any) => {
    setModalProduto(produto);
    setQuantidade(1);
    setObservacao('');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setModalProduto(null);
  };

  const handleAddToCart = () => {
    // Adicione ao carrinho real aqui
    closeModal();
  };

  return (
    <View style={styles.container}>
      {/* Banner do estabelecimento */}
      {estabelecimento.imagem ? (
        <Image source={{ uri: estabelecimento.imagem }} style={styles.banner} />
      ) : (
        <Image source={require('../assets/icon.png')} style={styles.banner} />
      )}
      {/* Botão de voltar fixo */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>{'<'} Voltar</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{estabelecimento.nome}</Text>
      {/* Categorias internas */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriaBar}>
        {categorias.map(cat => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.categoria, selectedCategoria === cat.key && styles.selectedCategoria]}
            onPress={() => setSelectedCategoria(cat.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.categoriaLabel, selectedCategoria === cat.key && styles.selectedCategoriaLabel]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {/* Lista de produtos */}
      {loading ? (
        <Text>Carregando...</Text>
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.85} onPress={() => openModal(item)}>
              <View style={styles.card}>
                <Image source={{ uri: item.imagem }} style={styles.prodImage} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.nome}</Text>
                  <Text style={styles.desc}>{item.descricao}</Text>
                  <Text style={styles.price}>R$ {item.preco.toFixed(2)}</Text>
                  <TouchableOpacity style={styles.addButton} onPress={() => openModal(item)}>
                    <Text style={styles.addButtonText}>Adicionar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
      <FloatingCartButton />
      {/* Modal de detalhes do produto */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {modalProduto && (
              <>
                <Image source={{ uri: modalProduto.imagem }} style={styles.modalImage} />
                <Text style={styles.modalName}>{modalProduto.nome}</Text>
                <Text style={styles.modalDesc}>{modalProduto.descricao}</Text>
                <Text style={styles.modalPrice}>R$ {modalProduto.preco.toFixed(2)}</Text>
                <View style={styles.qtdRow}>
                  <TouchableOpacity style={styles.qtdButton} onPress={() => setQuantidade(q => Math.max(1, q - 1))}><Text style={styles.qtdButtonText}>-</Text></TouchableOpacity>
                  <Text style={styles.qtdText}>{quantidade}</Text>
                  <TouchableOpacity style={styles.qtdButton} onPress={() => setQuantidade(q => q + 1)}><Text style={styles.qtdButtonText}>+</Text></TouchableOpacity>
                </View>
                <TextInput
                  style={styles.obsInput}
                  placeholder="Observação (ex: sem cebola)"
                  value={observacao}
                  onChangeText={setObservacao}
                />
                <TouchableOpacity style={styles.modalAddButton} onPress={handleAddToCart}>
                  <Text style={styles.modalAddButtonText}>Adicionar ao carrinho</Text>
                </TouchableOpacity>
                <Pressable style={styles.modalClose} onPress={closeModal}>
                  <Text style={styles.modalCloseText}>Fechar</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 0, backgroundColor: '#fff' },
  banner: { width: '100%', height: 120, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 8 },
  backButton: { position: 'absolute', top: 24, left: 16, backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, elevation: 2, zIndex: 10 },
  backButtonText: { color: '#e5293e', fontWeight: 'bold', fontSize: 15 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, marginLeft: 16, marginTop: 8 },
  categoriaBar: { marginBottom: 8, paddingLeft: 8 },
  categoria: { backgroundColor: '#f6f6f6', borderRadius: 18, paddingVertical: 10, paddingHorizontal: 20, marginRight: 10, borderWidth: 1, borderColor: '#eee' },
  selectedCategoria: { backgroundColor: '#e5293e', borderColor: '#e5293e' },
  categoriaLabel: { color: '#222', fontWeight: 'bold', fontSize: 15 },
  selectedCategoriaLabel: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 18, flexDirection: 'row', alignItems: 'center', padding: 0, marginBottom: 18, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f1f1' },
  prodImage: { width: 90, height: 90, borderRadius: 18, margin: 12, backgroundColor: '#f6f6f6' },
  name: { fontSize: 19, fontWeight: 'bold', marginTop: 8, marginLeft: 0, marginBottom: 2, color: '#222' },
  desc: { fontSize: 15, color: '#666', marginLeft: 0, marginBottom: 2 },
  price: { fontSize: 16, color: '#e5293e', marginLeft: 0, marginBottom: 8, fontWeight: 'bold' },
  addButton: { backgroundColor: '#e5293e', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 18, alignSelf: 'flex-start' },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  errorText: { color: 'red', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 18, padding: 24, width: 320, alignItems: 'center' },
  modalImage: { width: 120, height: 120, borderRadius: 18, marginBottom: 8, backgroundColor: '#f6f6f6' },
  modalName: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  modalDesc: { fontSize: 15, color: '#666', marginBottom: 8, textAlign: 'center' },
  modalPrice: { fontSize: 18, color: '#e5293e', fontWeight: 'bold', marginBottom: 12 },
  qtdRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  qtdButton: { backgroundColor: '#eee', borderRadius: 8, padding: 8, marginHorizontal: 12 },
  qtdButtonText: { fontSize: 18, color: '#e5293e', fontWeight: 'bold' },
  qtdText: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  obsInput: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 8, width: '100%', marginBottom: 12, color: '#222' },
  modalAddButton: { backgroundColor: '#e5293e', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, marginBottom: 8 },
  modalAddButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalClose: { marginTop: 4 },
  modalCloseText: { color: '#e5293e', fontWeight: 'bold', fontSize: 15 },
});

export default ProdutosDoEstabelecimentoScreen;

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { getEnderecos, addEndereco, deleteEndereco, updateEndereco, setEnderecoPadrao } from '../services/enderecoService';
// Para autocomplete, instale e use: react-native-google-places-autocomplete
// import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

const EnderecoScreen: React.FC = () => {
  const [enderecos, setEnderecos] = useState<any[]>([]);
  const [enderecoPadrao, setEnderecoPadrao] = useState<number | null>(null);
  const [novoEndereco, setNovoEndereco] = useState('');
  const [label, setLabel] = useState('');
  const [sugestoes, setSugestoes] = useState<any[]>([]);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' });

  useEffect(() => {
    (async () => {
      try {
        const lista = await getEnderecos();
        setEnderecos(lista);
        // Atualiza o endereço padrão ao entrar na tela
        const padrao = lista.find((e: any) => e.isDefault);
        setEnderecoPadrao(padrao ? padrao.id : null);
      } catch (e) {}
    })();
  }, []);

  const handleSalvar = async () => {
    try {
      const token = await import('@react-native-async-storage/async-storage').then(AsyncStorage => AsyncStorage.default.getItem('jwtToken'));
      console.log('JWT Token:', token);
      if (editId) {
        const atualizado = await updateEndereco(editId, { label, address: novoEndereco, latitude: lat, longitude: lng });
        setEnderecos(enderecos.map(e => e.id === editId ? atualizado : e));
        setEditId(null);
        setSnackbar({ visible: true, message: 'Endereço atualizado com sucesso!', type: 'success' });
      } else {
        const novo = await addEndereco({ label, address: novoEndereco, latitude: lat, longitude: lng });
        setEnderecos([...enderecos, novo]);
        setSnackbar({ visible: true, message: 'Endereço salvo com sucesso!', type: 'success' });
      }
      setNovoEndereco('');
      setLabel('');
      setLat(null);
      setLng(null);
    } catch (e) {
      console.log('Erro ao salvar endereço:', e);
      setSnackbar({ visible: true, message: 'Erro ao salvar endereço!', type: 'error' });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meus Endereços</Text>
      <FlatList
        data={enderecos}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.address}>{item.address}</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
              <TouchableOpacity onPress={async () => {
                await setEnderecoPadrao(item.id);
                // Atualiza lista e endereço padrão
                const lista = await getEnderecos();
                setEnderecos(lista);
                const padrao = lista.find((e: any) => e.isDefault);
                setEnderecoPadrao(padrao ? padrao.id : null);
              }}>
                <Text style={{ color: item.isDefault ? '#e5293e' : '#222', fontWeight: 'bold' }}>
                  {item.isDefault ? 'Padrão' : 'Definir como padrão'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                setEditId(item.id);
                setNovoEndereco(item.address);
                setLabel(item.label);
                setLat(item.latitude);
                setLng(item.longitude);
              }}>
                <Text style={{ color: '#222', fontWeight: 'bold' }}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => {
                await deleteEndereco(item.id);
                setEnderecos(enderecos.filter(e => e.id !== item.id));
              }}>
                <Text style={{ color: '#e5293e', fontWeight: 'bold' }}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum endereço salvo.</Text>}
      />
      <Text style={styles.subtitle}>Adicionar novo endereço</Text>
      {/* Autocomplete Nominatim (OpenStreetMap) */}
      <TextInput
        style={styles.input}
        placeholder="Pesquisar endereço"
        value={novoEndereco}
        onChangeText={async (text) => {
          setNovoEndereco(text);
          if (text.length > 3) {
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=br&q=${encodeURIComponent(text)}`);
              const data = await res.json();
              setSugestoes(data);
            } catch (e) {
              setSugestoes([]);
            }
          } else {
            setSugestoes([]);
          }
        }}
      />
      {sugestoes.length > 0 && (
        <View style={{ backgroundColor: '#fff', borderRadius: 8, elevation: 2, marginBottom: 8 }}>
          {sugestoes.map((item: any) => (
            <TouchableOpacity key={item.place_id} onPress={() => {
              setNovoEndereco(item.display_name);
              setLat(Number(item.lat));
              setLng(Number(item.lon));
              setSugestoes([]);
            }} style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
              <Text>{item.display_name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <TextInput
        style={styles.input}
        placeholder="Nome (ex: Casa, Trabalho)"
        value={label}
        onChangeText={setLabel}
      />
      <TouchableOpacity style={styles.button} onPress={handleSalvar}>
        <Text style={styles.buttonText}>Salvar endereço</Text>
      </TouchableOpacity>
      {enderecoPadrao && (
        <View style={{ marginTop: 16, alignItems: 'center' }}>
          <Text style={{ color: '#e5293e', fontWeight: 'bold' }}>Endereço padrão selecionado para o checkout!</Text>
        </View>
      )}
      {/* Snackbar de feedback */}
      {snackbar.visible && (
        <View style={{ position: 'absolute', bottom: 32, left: 16, right: 16, backgroundColor: snackbar.type === 'success' ? '#4BB543' : '#D32F2F', borderRadius: 8, padding: 14, alignItems: 'center', elevation: 4 }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{snackbar.message}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  subtitle: { fontSize: 16, fontWeight: 'bold', marginTop: 24, marginBottom: 8 },
  item: { marginBottom: 16, padding: 12, backgroundColor: '#f6f6f6', borderRadius: 12 },
  label: { fontWeight: 'bold', fontSize: 15 },
  address: { color: '#555', fontSize: 14 },
  empty: { color: '#888', textAlign: 'center', marginTop: 32 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10 },
  button: { backgroundColor: '#e5293e', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default EnderecoScreen;

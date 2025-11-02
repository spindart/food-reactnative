import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  Image, 
  Alert, 
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Picker } from '@react-native-picker/picker';
import { RootStackParamList } from '../types';
import { getCurrentUser } from '../services/currentUserService';
import { NotificacaoService } from '../services/notificacaoService';
import { getPerfil, updatePerfil, alterarSenha, UsuarioPerfil, UpdatePerfilData } from '../services/usuarioService';
import { formatCPF, formatPhone, validateCPF, validatePhone } from '../utils/validation';

const PerfilScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [user, setUser] = useState<any>(null);
  const [perfil, setPerfil] = useState<UsuarioPerfil | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);

  // Form states
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [genero, setGenero] = useState<string | null>(null);
  const [showGeneroPicker, setShowGeneroPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAlterarSenhaModal, setShowAlterarSenhaModal] = useState(false);

  // Alterar senha states
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);
  const [senhaErrors, setSenhaErrors] = useState<Record<string, string>>({});
  const [alterandoSenha, setAlterandoSenha] = useState(false);

  // Validation states
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadUserData();
    loadNotificacoes();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadNotificacoes();
      if (!isEditing) {
        loadUserData();
      }
    }, [isEditing])
  );

  const loadNotificacoes = async () => {
    try {
      const count = await NotificacaoService.contarNaoLidas();
      setNotificacoesNaoLidas(count);
    } catch (error) {
      console.error('Erro ao carregar contagem de notificações:', error);
    }
  };

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userData = await getCurrentUser();
      setUser(userData);

      // Carregar perfil completo da API
      const perfilData = await getPerfil();
      console.log('📥 Perfil carregado da API:', JSON.stringify(perfilData, null, 2));
      setPerfil(perfilData);
      
      // Popular campos do formulário
      setNome(perfilData.nome || '');
      setEmail(perfilData.email || '');
      
      // Formatar telefone - pode vir sem formatação do banco
      const telefoneValue = perfilData.telefone ? formatPhone(perfilData.telefone) : '';
      console.log('📱 Telefone formatado:', telefoneValue, 'original:', perfilData.telefone);
      setTelefone(telefoneValue);
      
      // Formatar CPF - pode vir sem formatação do banco
      const cpfValue = perfilData.cpf ? formatCPF(perfilData.cpf) : '';
      console.log('🆔 CPF formatado:', cpfValue, 'original:', perfilData.cpf);
      setCpf(cpfValue);
      setGenero(perfilData.genero || null);
      
      // Formatar data de nascimento
      if (perfilData.dataNascimento) {
        const date = new Date(perfilData.dataNascimento);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        setDataNascimento(`${day}/${month}/${year}`);
      } else {
        setDataNascimento('');
      }

      // Carregar foto de perfil
      if (perfilData.fotoPerfil) {
        setUserPhoto(perfilData.fotoPerfil);
      } else {
        const savedPhoto = await AsyncStorage.getItem('userPhoto');
        if (savedPhoto) {
          setUserPhoto(savedPhoto);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      Alert.alert('Erro', 'Não foi possível carregar seus dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (!email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'E-mail inválido';
    }

    if (telefone && telefone.replace(/\D/g, '').length > 0) {
      if (!validatePhone(telefone)) {
        newErrors.telefone = 'Telefone inválido';
      }
    }

    if (dataNascimento && dataNascimento.length > 0) {
      const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      if (!dateRegex.test(dataNascimento)) {
        newErrors.dataNascimento = 'Data inválida (use DD/MM/AAAA)';
      } else {
        const [, day, month, year] = dataNascimento.match(dateRegex)!;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (date > new Date()) {
          newErrors.dataNascimento = 'Data não pode ser futura';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = () => {
    setIsEditing(true);
    setErrors({});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrors({});
    // Resetar valores para os originais
    if (perfil) {
      setNome(perfil.nome || '');
      setEmail(perfil.email || '');
      setTelefone(perfil.telefone ? formatPhone(perfil.telefone) : '');
      setCpf(perfil.cpf ? formatCPF(perfil.cpf) : '');
      setGenero(perfil.genero || null);
      if (perfil.dataNascimento) {
        const date = new Date(perfil.dataNascimento);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        setDataNascimento(`${day}/${month}/${year}`);
      } else {
        setDataNascimento('');
      }
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Atenção', 'Por favor, corrija os erros antes de salvar.');
      return;
    }

    try {
      setSaving(true);

      // Preparar dados para envio
      const cpfLimpo = cpf.replace(/\D/g, '');
      const updateData: UpdatePerfilData = {
        nome: nome.trim(),
        email: email.trim(),
        telefone: telefone.replace(/\D/g, '') || null,
        genero: genero || null,
        fotoPerfil: userPhoto || null,
      };

      // Enviar CPF apenas se não estiver verificado e tiver valor
      if (!perfil?.cpfVerificado) {
        updateData.cpf = cpfLimpo || null;
      }

      console.log('📤 Dados enviados para atualização:', updateData);

      // Converter data de nascimento
      if (dataNascimento && dataNascimento.length > 0) {
        const [day, month, year] = dataNascimento.split('/');
        const dateStr = `${year}-${month}-${day}T00:00:00.000Z`;
        updateData.dataNascimento = dateStr;
      } else {
        updateData.dataNascimento = null;
      }

      const response = await updatePerfil(updateData);
      setPerfil(response.usuario);

      // Atualizar foto no AsyncStorage se houver
      if (userPhoto) {
        await AsyncStorage.setItem('userPhoto', userPhoto);
      }

      setIsEditing(false);
      Alert.alert('Sucesso!', 'Dados atualizados com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error);
      Alert.alert(
        'Erro',
        error.response?.data?.error || error.message || 'Não foi possível salvar os dados. Tente novamente.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Máscaras de entrada
  const formatTelefoneInput = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{0,4})/, (_, p1, p2, p3) => 
        p3 ? `(${p1}) ${p2}-${p3}` : p2 ? `(${p1}) ${p2}` : p1 ? `(${p1}` : ''
      );
    } else {
      return cleaned.replace(/(\d{2})(\d{5})(\d{0,4})/, (_, p1, p2, p3) => 
        p3 ? `(${p1}) ${p2}-${p3}` : p2 ? `(${p1}) ${p2}` : p1 ? `(${p1}` : ''
      );
    }
  };

  const formatDataInput = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  };

  const formatCPFInput = (text: string): string => {
    // Remove todos os caracteres não numéricos
    const cleaned = text.replace(/\D/g, '').slice(0, 11);
    
    // Aplica a máscara conforme o tamanho
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return cleaned.replace(/(\d{3})(\d+)/, '$1.$2');
    } else if (cleaned.length <= 9) {
      return cleaned.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
    } else {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d+)/, '$1.$2.$3-$4');
    }
  };

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária',
        'Precisamos de permissão para acessar sua galeria de fotos.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const imageUri = result.assets[0].base64 
        ? `data:image/jpeg;base64,${result.assets[0].base64}` 
        : result.assets[0].uri;
      
      setUserPhoto(imageUri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária',
        'Precisamos de permissão para acessar sua câmera.',
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const imageUri = result.assets[0].base64 
        ? `data:image/jpeg;base64,${result.assets[0].base64}` 
        : result.assets[0].uri;
      
      setUserPhoto(imageUri);
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Selecionar Foto',
      'Escolha uma opção:',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Câmera', onPress: takePhoto },
        { text: 'Galeria', onPress: pickImage },
      ]
    );
  };

  const handleTelefoneChange = (text: string) => {
    const formatted = formatTelefoneInput(text);
    setTelefone(formatted);
    // Validação em tempo real
    if (formatted.replace(/\D/g, '').length > 0) {
      if (!validatePhone(formatted)) {
        setErrors({ ...errors, telefone: 'Telefone inválido' });
      } else {
        const { telefone: _, ...rest } = errors;
        setErrors(rest);
      }
    } else {
      const { telefone: _, ...rest } = errors;
      setErrors(rest);
    }
  };

  const handleDataChange = (text: string) => {
    const formatted = formatDataInput(text);
    setDataNascimento(formatted);
    // Validação em tempo real
    if (formatted.length === 10) {
      const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      if (!dateRegex.test(formatted)) {
        setErrors({ ...errors, dataNascimento: 'Data inválida' });
      } else {
        const { dataNascimento: _, ...rest } = errors;
        setErrors(rest);
      }
    } else {
      const { dataNascimento: _, ...rest } = errors;
      setErrors(rest);
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    // Validação em tempo real
    if (text.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      setErrors({ ...errors, email: 'E-mail inválido' });
    } else {
      const { email: _, ...rest } = errors;
      setErrors(rest);
    }
  };

  const validateSenhaForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!senhaAtual.trim()) {
      newErrors.senhaAtual = 'Senha atual é obrigatória';
    }

    if (!novaSenha.trim()) {
      newErrors.novaSenha = 'Nova senha é obrigatória';
    } else if (novaSenha.length < 6) {
      newErrors.novaSenha = 'A senha deve ter pelo menos 6 caracteres';
    }

    if (!confirmarSenha.trim()) {
      newErrors.confirmarSenha = 'Confirmação de senha é obrigatória';
    } else if (novaSenha !== confirmarSenha) {
      newErrors.confirmarSenha = 'As senhas não coincidem';
    }

    setSenhaErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAlterarSenha = async () => {
    if (!validateSenhaForm()) {
      Alert.alert('Atenção', 'Por favor, corrija os erros antes de continuar.');
      return;
    }

    try {
      setAlterandoSenha(true);

      await alterarSenha({
        senhaAtual,
        novaSenha,
        confirmarSenha,
      });

      Alert.alert('Sucesso!', 'Senha alterada com sucesso!', [
        {
          text: 'OK',
          onPress: () => {
            setShowAlterarSenhaModal(false);
            setSenhaAtual('');
            setNovaSenha('');
            setConfirmarSenha('');
            setSenhaErrors({});
          },
        },
      ]);
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Não foi possível alterar a senha. Tente novamente.';
      
      // Tratar erros específicos
      if (errorMessage.includes('Senha atual incorreta')) {
        setSenhaErrors({ senhaAtual: 'Senha atual incorreta' });
      } else {
        Alert.alert('Erro', errorMessage);
      }
    } finally {
      setAlterandoSenha(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#ea1d2c" />
        </View>
      </SafeAreaView>
    );
  }

  // Renderizar modo de edição
  if (isEditing) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          {/* Header com botões de ação */}
          <View className="bg-white px-5 py-4 flex-row items-center justify-between border-b border-gray-200">
            <TouchableOpacity onPress={handleCancel} disabled={saving}>
              <Text className="text-base text-gray-600">Cancelar</Text>
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-900">Editar Perfil</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#ea1d2c" />
              ) : (
                <Text className="text-base font-semibold text-red-500">Salvar</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Foto de perfil */}
          <View className="bg-white mt-3 px-5 py-6 items-center">
            <View className="relative mb-4">
              <View className="w-28 h-28 rounded-full bg-red-500 items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                {userPhoto ? (
                  <Image 
                    source={{ uri: userPhoto }} 
                    className="w-full h-full rounded-full"
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="person" size={56} color="#fff" />
                )}
              </View>
              <TouchableOpacity
                onPress={showImagePickerOptions}
                className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-red-500 items-center justify-center border-2 border-white shadow-md"
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text className="text-sm text-gray-500">Toque para alterar a foto</Text>
          </View>

          {/* Formulário */}
          <View className="bg-white mt-3 px-5 py-4">
            <Text className="text-lg font-bold text-gray-900 mb-4">Dados Pessoais</Text>

            {/* Nome */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Nome completo *</Text>
              <TextInput
                className={`bg-gray-50 border ${errors.nome ? 'border-red-500' : 'border-gray-200'} rounded-lg px-4 py-3 text-base text-gray-900`}
                value={nome}
                onChangeText={(text) => {
                  setNome(text);
                  if (text.trim().length > 0) {
                    const { nome: _, ...rest } = errors;
                    setErrors(rest);
                  }
                }}
                placeholder="Seu nome completo"
                placeholderTextColor="#9ca3af"
              />
              {errors.nome && <Text className="text-red-500 text-xs mt-1">{errors.nome}</Text>}
            </View>

            {/* E-mail */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">E-mail *</Text>
              <TextInput
                className={`bg-gray-50 border ${errors.email ? 'border-red-500' : 'border-gray-200'} rounded-lg px-4 py-3 text-base text-gray-900`}
                value={email}
                onChangeText={handleEmailChange}
                placeholder="seu@email.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && <Text className="text-red-500 text-xs mt-1">{errors.email}</Text>}
              {perfil?.emailVerificado && (
                <View className="flex-row items-center mt-1">
                  <Ionicons name="checkmark-circle" size={14} color="#4caf50" />
                  <Text className="text-xs text-green-600 ml-1">E-mail verificado</Text>
                </View>
              )}
            </View>

            {/* Telefone */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Telefone</Text>
              <TextInput
                className={`bg-gray-50 border ${errors.telefone ? 'border-red-500' : 'border-gray-200'} rounded-lg px-4 py-3 text-base text-gray-900`}
                value={telefone}
                onChangeText={handleTelefoneChange}
                placeholder="(00) 00000-0000"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                maxLength={15}
              />
              {errors.telefone && <Text className="text-red-500 text-xs mt-1">{errors.telefone}</Text>}
              {perfil?.telefoneVerificado && (
                <View className="flex-row items-center mt-1">
                  <Ionicons name="checkmark-circle" size={14} color="#4caf50" />
                  <Text className="text-xs text-green-600 ml-1">Telefone verificado</Text>
                </View>
              )}
            </View>

            {/* CPF */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">CPF</Text>
              <TextInput
                className={`${perfil?.cpfVerificado ? 'bg-gray-100' : 'bg-gray-50'} border border-gray-200 rounded-lg px-4 py-3 text-base ${perfil?.cpfVerificado ? 'text-gray-500' : 'text-gray-900'}`}
                value={cpf}
                onChangeText={(text) => {
                  if (!perfil?.cpfVerificado) {
                    const formatted = formatCPFInput(text);
                    setCpf(formatted);
                  }
                }}
                editable={!perfil?.cpfVerificado}
                placeholder="000.000.000-00"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                maxLength={14}
              />
              {perfil?.cpfVerificado && (
                <View className="flex-row items-center mt-1">
                  <Ionicons name="lock-closed" size={14} color="#6b7280" />
                  <Text className="text-xs text-gray-500 ml-1">CPF verificado - não pode ser alterado</Text>
                </View>
              )}
            </View>

            {/* Data de nascimento */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Data de nascimento</Text>
              <TextInput
                className={`bg-gray-50 border ${errors.dataNascimento ? 'border-red-500' : 'border-gray-200'} rounded-lg px-4 py-3 text-base text-gray-900`}
                value={dataNascimento}
                onChangeText={handleDataChange}
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                maxLength={10}
              />
              {errors.dataNascimento && <Text className="text-red-500 text-xs mt-1">{errors.dataNascimento}</Text>}
            </View>

            {/* Gênero */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Gênero</Text>
              <TouchableOpacity
                className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex-row items-center justify-between"
                onPress={() => setShowGeneroPicker(true)}
              >
                <Text className={`text-base ${genero ? 'text-gray-900' : 'text-gray-400'}`}>
                  {genero === 'masculino' ? 'Masculino' :
                   genero === 'feminino' ? 'Feminino' :
                   genero === 'outro' ? 'Outro' :
                   genero === 'prefiro_não_informar' ? 'Prefiro não informar' :
                   'Selecione'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Botão de alterar senha */}
          <View className="bg-white mt-3 px-5 py-4">
            <TouchableOpacity
              className="flex-row items-center justify-between py-3"
              onPress={() => {
                setShowAlterarSenhaModal(true);
                setSenhaAtual('');
                setNovaSenha('');
                setConfirmarSenha('');
                setSenhaErrors({});
              }}
            >
              <View className="flex-row items-center flex-1">
                <Ionicons name="lock-closed" size={20} color="#6b7280" />
                <Text className="text-base font-semibold text-gray-900 ml-3">Alterar senha</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Modal de seleção de gênero */}
        <Modal
          visible={showGeneroPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowGeneroPicker(false)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl">
              <View className="px-5 py-4 border-b border-gray-200 flex-row items-center justify-between">
                <Text className="text-lg font-bold text-gray-900">Selecionar gênero</Text>
                <TouchableOpacity onPress={() => setShowGeneroPicker(false)}>
                  <Text className="text-red-500 text-base font-semibold">Concluir</Text>
                </TouchableOpacity>
              </View>
              <Picker
                selectedValue={genero || ''}
                onValueChange={(value) => setGenero(value || null)}
                style={{ height: 200 }}
              >
                <Picker.Item label="Selecione..." value="" />
                <Picker.Item label="Masculino" value="masculino" />
                <Picker.Item label="Feminino" value="feminino" />
                <Picker.Item label="Outro" value="outro" />
                <Picker.Item label="Prefiro não informar" value="prefiro_não_informar" />
              </Picker>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // Renderizar modo de visualização
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header com avatar e nome */}
        <View className="bg-white pt-6 pb-8 px-5 items-center border-b border-gray-100">
          <View className="relative mb-4">
            {/* Avatar */}
            <View className="w-24 h-24 rounded-full bg-red-500 items-center justify-center border-4 border-white shadow-lg overflow-hidden">
              {userPhoto ? (
                <Image 
                  source={{ uri: userPhoto }} 
                  className="w-full h-full rounded-full"
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={48} color="#fff" />
              )}
            </View>
          </View>
          
          {/* Nome do usuário */}
          <Text className="text-lg font-bold text-gray-900 mb-1">
            {perfil?.nome || user?.nome || 'Usuário'}
          </Text>
          
          {/* Email */}
          <Text className="text-base text-gray-500">
            {perfil?.email || user?.email || 'usuario@email.com'}
          </Text>
        </View>

        {/* Seção de opções */}
        <View className="bg-white mt-3 px-5 py-4">
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Minha Conta
          </Text>

          {/* Dados da Conta */}
          <TouchableOpacity 
            className="flex-row items-center py-4 border-b border-gray-100"
            onPress={handleEdit}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center mr-4">
                <Ionicons name="person" size={20} color="#ea1d2c" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900 mb-1">
                  Dados da Conta
                </Text>
                <Text className="text-sm text-gray-500">
                  Visualizar e editar seus dados pessoais
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>

          {/* Minhas Conversas */}
          <TouchableOpacity 
            className="flex-row items-center py-4 border-b border-gray-100"
            onPress={() => (navigation as any).navigate('ConversasEstabelecimento')}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-4">
                <Ionicons name="chatbubbles" size={20} color="#3b82f6" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900 mb-1">
                  Conversas
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>

          {/* Notificações */}
          <TouchableOpacity 
            className="flex-row items-center py-4"
            onPress={() => (navigation as any).navigate('Notificacoes')}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center mr-4 relative">
                <Ionicons name="notifications" size={20} color="#ea1d2c" />
                {notificacoesNaoLidas > 0 && (
                  <View className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 items-center justify-center border-2 border-white">
                    <Text className="text-white text-xs font-bold">
                      {notificacoesNaoLidas > 99 ? '99+' : notificacoesNaoLidas}
                    </Text>
                  </View>
                )}
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-base font-semibold text-gray-900">
                    Notificações
                  </Text>
                  {notificacoesNaoLidas > 0 && (
                    <View className="bg-red-500 px-2 py-0.5 rounded-full">
                      <Text className="text-white text-xs font-bold">
                        {notificacoesNaoLidas}
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-sm text-gray-500">
                  Ver todas as notificações
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>

          {/* Meus Pedidos */}
          <TouchableOpacity 
            className="flex-row items-center py-4 border-t border-gray-100"
            onPress={() => (navigation as any).navigate('HomeTabs', { screen: 'Pedidos' })}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-full bg-amber-50 items-center justify-center mr-4">
                <Ionicons name="receipt" size={20} color="#f59e0b" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900 mb-1">
                  Pedidos
                </Text>
                <Text className="text-sm text-gray-500">
                  Histórico de pedidos
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>

          {/* Meus Endereços */}
          <TouchableOpacity
            className="flex-row items-center py-4 border-t border-gray-100"
            onPress={() => navigation.navigate('Enderecos')}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center mr-4">
                <Ionicons name="location" size={20} color="#ea1d2c" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900 mb-1">
                  Endereços
                </Text>
                <Text className="text-sm text-gray-500">
                  Gerencie seus endereços de entrega
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>

          {/* Meus Cartões */}
          <TouchableOpacity
            className="flex-row items-center py-4 border-t border-gray-100"
            onPress={() => (navigation as any).navigate('MeusCartoes')}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-full bg-yellow-50 items-center justify-center mr-4">
                <Ionicons name="card" size={20} color="#eab308" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900 mb-1">
                  Cartões
                </Text>
                <Text className="text-sm text-gray-500">
                  Gerencie seus cartões salvos
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>

          {/* Minhas Avaliações */}
          <TouchableOpacity
            className="flex-row items-center py-4 border-t border-gray-100"
            onPress={() => (navigation as any).navigate('MinhasAvaliacoes')}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-full bg-amber-50 items-center justify-center mr-4">
                <Ionicons name="star" size={20} color="#f59e0b" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900 mb-1">
                  Minhas Avaliações
                </Text>
                <Text className="text-sm text-gray-500">
                  Veja todas as suas avaliações
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>

          {/* Alterar senha */}
          <TouchableOpacity
            className="flex-row items-center py-4 border-t border-gray-100"
            onPress={() => {
              setShowAlterarSenhaModal(true);
              setSenhaAtual('');
              setNovaSenha('');
              setConfirmarSenha('');
              setSenhaErrors({});
            }}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center mr-4">
                <Ionicons name="lock-closed" size={20} color="#6b7280" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900 mb-1">
                  Alterar senha
                </Text>
                <Text className="text-sm text-gray-500">
                  Altere sua senha de acesso
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>

        </View>

        {/* Botão de logout */}
        <View className="bg-white mt-3 px-5 py-6">
          <TouchableOpacity
            className="bg-white border-2 border-red-500 py-4 px-6 rounded-xl items-center"
            onPress={async () => {
              await AsyncStorage.removeItem('jwtToken');
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            }}
            activeOpacity={0.8}
          >
            <Text className="text-red-500 text-base font-semibold">
              Sair da Conta
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de alterar senha (também disponível no modo de visualização) */}
      <Modal
        visible={showAlterarSenhaModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAlterarSenhaModal(false)}
      >
        <SafeAreaView className="flex-1 bg-black/50 justify-center px-4">
          <View className="bg-white rounded-2xl px-5 py-6 max-h-[90%]">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-2xl font-bold text-gray-900">Alterar Senha</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAlterarSenhaModal(false);
                  setSenhaAtual('');
                  setNovaSenha('');
                  setConfirmarSenha('');
                  setSenhaErrors({});
                }}
                disabled={alterandoSenha}
              >
                <Ionicons name="close" size={28} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Senha atual */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">Senha atual *</Text>
                <View className="relative">
                  <TextInput
                    className={`bg-gray-50 border ${senhaErrors.senhaAtual ? 'border-red-500' : 'border-gray-200'} rounded-lg px-4 py-3 pr-12 text-base text-gray-900`}
                    value={senhaAtual}
                    onChangeText={(text) => {
                      setSenhaAtual(text);
                      if (text.trim().length > 0) {
                        const { senhaAtual: _, ...rest } = senhaErrors;
                        setSenhaErrors(rest);
                      }
                    }}
                    placeholder="Digite sua senha atual"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showSenhaAtual}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowSenhaAtual(!showSenhaAtual)}
                    className="absolute right-3 top-0 bottom-0 justify-center"
                  >
                    <Ionicons
                      name={showSenhaAtual ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
                {senhaErrors.senhaAtual && (
                  <Text className="text-red-500 text-xs mt-1">{senhaErrors.senhaAtual}</Text>
                )}
              </View>

              {/* Nova senha */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">Nova senha *</Text>
                <View className="relative">
                  <TextInput
                    className={`bg-gray-50 border ${senhaErrors.novaSenha ? 'border-red-500' : 'border-gray-200'} rounded-lg px-4 py-3 pr-12 text-base text-gray-900`}
                    value={novaSenha}
                    onChangeText={(text) => {
                      setNovaSenha(text);
                      if (text.trim().length >= 6) {
                        const { novaSenha: _, ...rest } = senhaErrors;
                        setSenhaErrors(rest);
                      } else if (text.trim().length > 0) {
                        setSenhaErrors({ ...senhaErrors, novaSenha: 'A senha deve ter pelo menos 6 caracteres' });
                      }
                    }}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showNovaSenha}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowNovaSenha(!showNovaSenha)}
                    className="absolute right-3 top-0 bottom-0 justify-center"
                  >
                    <Ionicons
                      name={showNovaSenha ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
                {senhaErrors.novaSenha && (
                  <Text className="text-red-500 text-xs mt-1">{senhaErrors.novaSenha}</Text>
                )}
                <Text className="text-xs text-gray-500 mt-1">A senha deve ter pelo menos 6 caracteres</Text>
              </View>

              {/* Confirmar nova senha */}
              <View className="mb-6">
                <Text className="text-sm font-semibold text-gray-700 mb-2">Confirmar nova senha *</Text>
                <View className="relative">
                  <TextInput
                    className={`bg-gray-50 border ${senhaErrors.confirmarSenha ? 'border-red-500' : 'border-gray-200'} rounded-lg px-4 py-3 pr-12 text-base text-gray-900`}
                    value={confirmarSenha}
                    onChangeText={(text) => {
                      setConfirmarSenha(text);
                      if (text === novaSenha && text.trim().length > 0) {
                        const { confirmarSenha: _, ...rest } = senhaErrors;
                        setSenhaErrors(rest);
                      } else if (text.trim().length > 0) {
                        setSenhaErrors({ ...senhaErrors, confirmarSenha: 'As senhas não coincidem' });
                      }
                    }}
                    placeholder="Digite a nova senha novamente"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showConfirmarSenha}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmarSenha(!showConfirmarSenha)}
                    className="absolute right-3 top-0 bottom-0 justify-center"
                  >
                    <Ionicons
                      name={showConfirmarSenha ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
                {senhaErrors.confirmarSenha && (
                  <Text className="text-red-500 text-xs mt-1">{senhaErrors.confirmarSenha}</Text>
                )}
              </View>

              {/* Botões */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setShowAlterarSenhaModal(false);
                    setSenhaAtual('');
                    setNovaSenha('');
                    setConfirmarSenha('');
                    setSenhaErrors({});
                  }}
                  disabled={alterandoSenha}
                  className="flex-1 bg-gray-100 border border-gray-300 rounded-xl py-4 items-center"
                >
                  <Text className="text-base font-semibold text-gray-700">Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAlterarSenha}
                  disabled={alterandoSenha}
                  className={`flex-1 bg-red-500 rounded-xl py-4 items-center ${alterandoSenha ? 'opacity-50' : ''}`}
                >
                  {alterandoSenha ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-base font-semibold text-white">Alterar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default PerfilScreen;

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { getCurrentUser } from '../services/currentUserService';

const PerfilScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [user, setUser] = useState<any>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await getCurrentUser();
      console.log('Dados do usuário carregados:', userData);
      setUser(userData);
      
      // Carregar foto salva do usuário (se existir)
      const savedPhoto = await AsyncStorage.getItem('userPhoto');
      if (savedPhoto) {
        setUserPhoto(savedPhoto);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    } finally {
      setLoading(false);
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
      
      // Salvar foto no AsyncStorage
      await AsyncStorage.setItem('userPhoto', imageUri);
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
      
      // Salvar foto no AsyncStorage
      await AsyncStorage.setItem('userPhoto', imageUri);
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

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#ea1d2c" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header com avatar e nome */}
        <View className="bg-white pt-6 pb-8 px-5 items-center border-b border-gray-100">
          <View className="relative mb-4">
            {/* Avatar */}
            <View className="w-24 h-24 rounded-full bg-red-500 items-center justify-center border-4 border-white shadow-lg">
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
            
            {/* Botão de editar avatar */}
            <TouchableOpacity
              onPress={showImagePickerOptions}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-red-500 items-center justify-center border-2 border-white shadow-md"
              activeOpacity={0.8}
            >
              <Ionicons name="pencil" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {/* Email em destaque */}
          <Text className="text-lg font-bold text-gray-900 mb-1">
            {user?.email || 'usuario@email.com'}
          </Text>
          
          {/* Nome do usuário */}
          <Text className="text-base text-gray-500">
            {user?.nome || 'Usuário'}
          </Text>
        </View>

        {/* Seção de opções */}
        <View className="bg-white mt-3 px-5 py-4">
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Minha Conta
          </Text>
          
          {/* Meus Endereços */}
          <TouchableOpacity
            className="flex-row items-center py-4 border-b border-gray-100"
            onPress={() => navigation.navigate('Enderecos')}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center mr-4">
                <Ionicons name="location" size={20} color="#ea1d2c" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900 mb-1">
                  Meus Endereços
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
            className="flex-row items-center py-4 border-b border-gray-100"
            onPress={() => (navigation as any).navigate('MeusCartoes')}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-full bg-yellow-50 items-center justify-center mr-4">
                <Ionicons name="card" size={20} color="#eab308" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900 mb-1">
                  Meus Cartões
                </Text>
                <Text className="text-sm text-gray-500">
                  Gerencie seus cartões salvos
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>

          {/* Meus Pedidos */}
          <TouchableOpacity 
            className="flex-row items-center py-4"
            onPress={() => (navigation as any).navigate('HomeTabs', { screen: 'Pedidos' })}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-full bg-amber-50 items-center justify-center mr-4">
                <Ionicons name="receipt" size={20} color="#f59e0b" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900 mb-1">
                  Meus Pedidos
                </Text>
                <Text className="text-sm text-gray-500">
                  Histórico de pedidos
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
    </SafeAreaView>
  );
};

export default PerfilScreen;

export default PerfilScreen;

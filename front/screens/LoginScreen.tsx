import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { login } from '../services/authService';
import { useNavigation } from '@react-navigation/native';
import { Snackbar } from 'react-native-paper';
import { getCurrentUser } from '../services/currentUserService';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

const LoginScreen: React.FC = () => {
  const navigation = useNavigation();
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>(
    { visible: false, message: '', type: 'success' }
  );
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    const payload = {
      email: data.email,
      senha: data.password,
    };
    try {
      setLoading(true);
      const response = await login(payload);
      setSnackbar({ visible: true, message: 'Login realizado com sucesso!', type: 'success' });
      setTimeout(async () => {
        setSnackbar((prev) => ({ ...prev, visible: false }));
        const user = await getCurrentUser();
        if (user?.role === 'dono') {
          navigation.navigate('DonoDashboard');
        } else {
          navigation.navigate('HomeTabs');
        }
      }, 1500);
    } catch (error: any) {
      console.error('Erro ao fazer login:', error);
      
      // Extrair mensagem de erro mais específica
      let errorMessage = 'E-mail ou senha inválidos.';
      
      if (error?.response?.status === 401) {
        errorMessage = 'E-mail ou senha inválidos.';
      } else if (error?.response?.status === 500) {
        errorMessage = error?.response?.data?.error || 'Erro no servidor. Tente novamente.';
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setSnackbar({ visible: true, message: errorMessage, type: 'error' });
      setTimeout(() => setSnackbar((prev) => ({ ...prev, visible: false })), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50"
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 justify-center px-6 py-8">
          {/* Logo/Header */}
          <View className="items-center mb-12">
            <View className="w-20 h-20 rounded-full bg-red-500 items-center justify-center mb-4">
              <Ionicons name="restaurant" size={40} color="#fff" />
            </View>
            <Text className="text-3xl font-bold text-gray-900 mb-2">
              Bem-vindo!
            </Text>
            <Text className="text-base text-gray-600 text-center">
              Entre com sua conta para continuar
            </Text>
          </View>

          {/* Formulário */}
          <View className="mb-6">
            {/* Campo Email */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                E-mail
              </Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View className="relative">
                    <View className="absolute left-3 top-0 bottom-0 justify-center z-10">
                      <Ionicons name="mail-outline" size={20} color="#9ca3af" />
                    </View>
                    <TextInput
                      className={`w-full pl-11 pr-4 py-3 bg-white rounded-xl border ${
                        errors.email ? 'border-red-500' : 'border-gray-200'
                      } text-gray-900`}
                      placeholder="seu@email.com"
                      placeholderTextColor="#9ca3af"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  </View>
                )}
              />
              {errors.email && (
                <Text className="text-red-500 text-xs mt-1 ml-1">
                  {errors.email.message}
                </Text>
              )}
            </View>

            {/* Campo Senha */}
            <View className="mb-6">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Senha
              </Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View className="relative">
                    <View className="absolute left-3 top-0 bottom-0 justify-center z-10">
                      <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
                    </View>
                    <TextInput
                      className={`w-full pl-11 pr-12 py-3 bg-white rounded-xl border ${
                        errors.password ? 'border-red-500' : 'border-gray-200'
                      } text-gray-900`}
                      placeholder="••••••••"
                      placeholderTextColor="#9ca3af"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-0 bottom-0 justify-center z-10"
                    >
                      <Ionicons 
                        name={showPassword ? 'eye-outline' : 'eye-off-outline'} 
                        size={20} 
                        color="#9ca3af" 
                      />
                    </TouchableOpacity>
                  </View>
                )}
              />
              {errors.password && (
                <Text className="text-red-500 text-xs mt-1 ml-1">
                  {errors.password.message}
                </Text>
              )}
            </View>

            {/* Botão Entrar */}
            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
              className={`w-full py-4 rounded-xl items-center justify-center ${
                loading ? 'bg-gray-400' : 'bg-red-500'
              } shadow-lg`}
              activeOpacity={0.8}
            >
              {loading ? (
                <Text className="text-white text-base font-semibold">Carregando...</Text>
              ) : (
                <Text className="text-white text-base font-semibold">Entrar</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Link para Cadastro */}
          <View className="flex-row justify-center items-center mt-4">
            <Text className="text-gray-600 text-sm">
              Não tem uma conta?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text className="text-red-500 font-semibold text-sm">
                Cadastre-se
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Snackbar */}
      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={2000}
        style={{ 
          backgroundColor: snackbar.type === 'success' ? '#10b981' : '#ef4444',
          marginBottom: 16 
        }}
      >
        {snackbar.message}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

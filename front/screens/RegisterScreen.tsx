import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { register } from '../services/authService';
import { useNavigation } from '@react-navigation/native';
import { Snackbar } from 'react-native-paper';
import { validateCPF, formatCPF, validatePhone, formatPhone } from '../utils/validation';
import { sendVerificationCode, verifyCode } from '../services/whatsappService';

const registerSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  cpf: z.string()
    .refine((val) => validateCPF(val), 'CPF inválido')
    .transform((val) => val.replace(/\D/g, '')),
  phone: z.string()
    .refine((val) => validatePhone(val), 'Telefone inválido')
    .transform((val) => val.replace(/\D/g, '')),
});

type RegisterForm = z.infer<typeof registerSchema>;

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation();
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>(
    { visible: false, message: '', type: 'success' }
  );
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'verification'>('form');
  const [verificationCode, setVerificationCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formData, setFormData] = useState<RegisterForm | null>(null);
  
  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmitForm = async (data: RegisterForm) => {
    try {
      setLoading(true);
      setFormData(data);
      setPhoneNumber(data.phone);
      
      // Enviar código de verificação via WhatsApp
      setSendingCode(true);
      await sendVerificationCode({ phone: data.phone });
      setSendingCode(false);
      
      // Ir para tela de verificação
      setStep('verification');
      setSnackbar({ 
        visible: true, 
        message: 'Código enviado para seu WhatsApp!', 
        type: 'success' 
      });
    } catch (error) {
      setSendingCode(false);
      setSnackbar({ 
        visible: true, 
        message: 'Erro ao enviar código. Tente novamente.', 
        type: 'error' 
      });
      console.error('Erro ao enviar código:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmitVerification = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setSnackbar({ 
        visible: true, 
        message: 'Código deve ter 6 dígitos', 
        type: 'error' 
      });
      return;
    }

    try {
      setLoading(true);
      
      // Verificar código
      const isValid = await verifyCode({ 
        phone: phoneNumber, 
        code: verificationCode 
      });

      if (!isValid) {
        setSnackbar({ 
          visible: true, 
          message: 'Código inválido. Tente novamente.', 
          type: 'error' 
        });
        return;
      }

      // Código válido, finalizar cadastro
      if (!formData) return;

      const payload = {
        nome: formData.name,
        email: formData.email,
        senha: formData.password,
        cpf: formData.cpf,
        telefone: formData.phone,
      };

      const response = await register(payload);
      console.log('Registro bem-sucedido:', response);
      
      setSnackbar({ 
        visible: true, 
        message: 'Cadastro realizado com sucesso!', 
        type: 'success' 
      });
      
      setTimeout(() => {
        setSnackbar((prev) => ({ ...prev, visible: false }));
        navigation.navigate('Login');
      }, 1500);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || 'Erro ao registrar usuário.';
      setSnackbar({ 
        visible: true, 
        message: errorMessage, 
        type: 'error' 
      });
      console.error('Erro ao registrar usuário:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!phoneNumber) return;
    
    try {
      setSendingCode(true);
      await sendVerificationCode({ phone: phoneNumber });
      setSnackbar({ 
        visible: true, 
        message: 'Código reenviado com sucesso!', 
        type: 'success' 
      });
    } catch (error) {
      setSnackbar({ 
        visible: true, 
        message: 'Erro ao reenviar código.', 
        type: 'error' 
      });
    } finally {
      setSendingCode(false);
    }
  };

  // Renderizar etapa de verificação
  if (step === 'verification') {
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
            {/* Header */}
            <View className="items-center mb-8">
              <TouchableOpacity
                onPress={() => setStep('form')}
                className="absolute left-0 top-0"
              >
                <Ionicons name="arrow-back" size={24} color="#374151" />
              </TouchableOpacity>
              
              <View className="w-16 h-16 rounded-full bg-green-500 items-center justify-center mb-4">
                <Ionicons name="logo-whatsapp" size={32} color="#fff" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-2">
                Verificação WhatsApp
              </Text>
              <Text className="text-base text-gray-600 text-center mb-1">
                Enviamos um código de 6 dígitos para
              </Text>
              <Text className="text-base font-semibold text-gray-900">
                {formatPhone(phoneNumber)}
              </Text>
              <Text className="text-sm text-gray-500 text-center mt-2">
                Por favor, verifique seu WhatsApp e insira o código recebido
              </Text>
            </View>

            {/* Campo de Código */}
            <View className="mb-6">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Código de Verificação
              </Text>
              <TextInput
                className="w-full px-4 py-4 bg-white rounded-xl border border-gray-200 text-gray-900 text-center text-2xl font-bold tracking-widest"
                placeholder="000000"
                placeholderTextColor="#d1d5db"
                value={verificationCode}
                onChangeText={(text) => setVerificationCode(text.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
            </View>

            {/* Botão Verificar */}
            <TouchableOpacity
              onPress={onSubmitVerification}
              disabled={loading || verificationCode.length !== 6}
              className={`w-full py-4 rounded-xl items-center justify-center ${
                loading || verificationCode.length !== 6 ? 'bg-gray-400' : 'bg-green-500'
              } shadow-lg mb-4`}
              activeOpacity={0.8}
            >
              {loading ? (
                <Text className="text-white text-base font-semibold">Verificando...</Text>
              ) : (
                <Text className="text-white text-base font-semibold">Verificar e Finalizar</Text>
              )}
            </TouchableOpacity>

            {/* Reenviar Código */}
            <TouchableOpacity
              onPress={handleResendCode}
              disabled={sendingCode}
              className="py-3"
              activeOpacity={0.7}
            >
              <Text className="text-green-600 text-center font-semibold">
                {sendingCode ? 'Enviando...' : 'Reenviar código'}
              </Text>
            </TouchableOpacity>

            <Text className="text-xs text-gray-500 text-center mt-4">
              Não recebeu o código? Verifique se o número está correto e tente novamente.
            </Text>
          </View>
        </ScrollView>

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
  }

  // Renderizar formulário de cadastro
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50"
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 justify-center px-6 py-8">
          {/* Logo/Header */}
          <View className="items-center mb-8">
            <View className="w-20 h-20 rounded-full bg-red-500 items-center justify-center mb-4">
              <Ionicons name="person-add" size={40} color="#fff" />
            </View>
            <Text className="text-3xl font-bold text-gray-900 mb-2">
              Criar Conta
            </Text>
            <Text className="text-base text-gray-600 text-center">
              Preencha os dados para se cadastrar
            </Text>
          </View>

          {/* Formulário */}
          <View className="mb-6">
            {/* Campo Nome */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Nome Completo
              </Text>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View className="relative">
                    <View className="absolute left-3 top-0 bottom-0 justify-center z-10">
                      <Ionicons name="person-outline" size={20} color="#9ca3af" />
                    </View>
                    <TextInput
                      className={`w-full pl-11 pr-4 py-3 bg-white rounded-xl border ${
                        errors.name ? 'border-red-500' : 'border-gray-200'
                      } text-gray-900`}
                      placeholder="Seu nome completo"
                      placeholderTextColor="#9ca3af"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      autoCapitalize="words"
                    />
                  </View>
                )}
              />
              {errors.name && (
                <Text className="text-red-500 text-xs mt-1 ml-1">
                  {errors.name.message}
                </Text>
              )}
            </View>

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

            {/* Campo CPF */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                CPF
              </Text>
              <Controller
                control={control}
                name="cpf"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View className="relative">
                    <View className="absolute left-3 top-0 bottom-0 justify-center z-10">
                      <Ionicons name="card-outline" size={20} color="#9ca3af" />
                    </View>
                    <TextInput
                      className={`w-full pl-11 pr-4 py-3 bg-white rounded-xl border ${
                        errors.cpf ? 'border-red-500' : 'border-gray-200'
                      } text-gray-900`}
                      placeholder="000.000.000-00"
                      placeholderTextColor="#9ca3af"
                      onBlur={onBlur}
                      onChangeText={(text) => {
                        const formatted = formatCPF(text);
                        onChange(formatted);
                      }}
                      value={value}
                      keyboardType="number-pad"
                      maxLength={14}
                    />
                  </View>
                )}
              />
              {errors.cpf && (
                <Text className="text-red-500 text-xs mt-1 ml-1">
                  {errors.cpf.message}
                </Text>
              )}
            </View>

            {/* Campo Telefone */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Celular (WhatsApp)
              </Text>
              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View className="relative">
                    <View className="absolute left-3 top-0 bottom-0 justify-center z-10">
                      <Ionicons name="call-outline" size={20} color="#9ca3af" />
                    </View>
                    <TextInput
                      className={`w-full pl-11 pr-4 py-3 bg-white rounded-xl border ${
                        errors.phone ? 'border-red-500' : 'border-gray-200'
                      } text-gray-900`}
                      placeholder="(00) 00000-0000"
                      placeholderTextColor="#9ca3af"
                      onBlur={onBlur}
                      onChangeText={(text) => {
                        const formatted = formatPhone(text);
                        onChange(formatted);
                      }}
                      value={value}
                      keyboardType="phone-pad"
                      maxLength={15}
                    />
                  </View>
                )}
              />
              {errors.phone && (
                <Text className="text-red-500 text-xs mt-1 ml-1">
                  {errors.phone.message}
                </Text>
              )}
              <Text className="text-xs text-gray-500 mt-1 ml-1">
                Receberá um código de verificação no WhatsApp
              </Text>
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

            {/* Botão Continuar */}
            <TouchableOpacity
              onPress={handleSubmit(onSubmitForm)}
              disabled={loading}
              className={`w-full py-4 rounded-xl items-center justify-center ${
                loading ? 'bg-gray-400' : 'bg-red-500'
              } shadow-lg`}
              activeOpacity={0.8}
            >
              {loading ? (
                <Text className="text-white text-base font-semibold">Carregando...</Text>
              ) : (
                <Text className="text-white text-base font-semibold">Continuar</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Link para Login */}
          <View className="flex-row justify-center items-center mt-4">
            <Text className="text-gray-600 text-sm">
              Já tem uma conta?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text className="text-red-500 font-semibold text-sm">
                Faça login
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

export default RegisterScreen;

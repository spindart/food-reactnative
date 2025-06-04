import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

type LoginPayload = {
  email: string;
  senha: string;
};

type RegisterPayload = {
  nome: string;
  email: string;
  senha: string;
  role: 'cliente' | 'dono' | 'admin';
};

export const login = async (payload: LoginPayload) => {
  try {
    const response = await api.post('/auth/login', payload);
    const { token } = response.data;
    await AsyncStorage.setItem('jwtToken', token); // Corrigido para React Native
    return response.data;
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    throw error;
  }
};

export const register = async (
  payload: Omit<RegisterPayload, 'role'>,
  role: RegisterPayload['role'] = 'cliente'
) => {
  try {
    console.log('Payload enviado para registro:', { ...payload, role });
    // Sempre envia role, padrão 'cliente'
    const data = { ...payload, role };
    const response = await api.post('/auth/register', data);
    if (response.data?.token) {
      await AsyncStorage.setItem('jwtToken', response.data.token);
    }
    return response.data;
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'response' in error) {
        // @ts-ignore
        console.error('Erro ao registrar usuário:', (error as any).response.data);
    }
    console.error('Erro ao registrar usuário:', error);
    throw error;
  }
};

export const logout = async () => {
  await AsyncStorage.removeItem('jwtToken'); // Corrigido para React Native
  console.log('Logout realizado com sucesso');
};
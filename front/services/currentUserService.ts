import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

export const getCurrentUser = async () => {
  const token = await AsyncStorage.getItem('jwtToken');
  if (!token) return null;
  try {
    const decoded: any = jwtDecode(token);
    return decoded;
  } catch {
    return null;
  }
};

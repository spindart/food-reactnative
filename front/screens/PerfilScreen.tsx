import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

const PerfilScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header com avatar e nome */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
            <TouchableOpacity style={styles.editAvatarButton}>
              <Text style={styles.editAvatarText}>✏️</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>Usuário</Text>
          <Text style={styles.userEmail}>usuario@email.com</Text>
        </View>

        {/* Seção de opções */}
        <View style={styles.optionsSection}>
          <Text style={styles.sectionTitle}>Minha Conta</Text>
          
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => navigation.navigate('Enderecos')}
          >
            <View style={styles.optionLeft}>
              <View style={styles.optionIcon}>
                <Text style={styles.iconText}>📍</Text>
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Meus Endereços</Text>
                <Text style={styles.optionSubtitle}>Gerencie seus endereços de entrega</Text>
              </View>
            </View>
            <View style={styles.optionRight}>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => navigation.navigate('MeusCartoes')}
          >
            <View style={styles.optionLeft}>
              <View style={styles.optionIcon}>
                <Text style={styles.iconText}>💳</Text>
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Meus Cartões</Text>
                <Text style={styles.optionSubtitle}>Gerencie seus cartões salvos</Text>
              </View>
            </View>
            <View style={styles.optionRight}>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem}>
            <View style={styles.optionLeft}>
              <View style={styles.optionIcon}>
                <Text style={styles.iconText}>📋</Text>
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Meus Pedidos</Text>
                <Text style={styles.optionSubtitle}>Histórico de pedidos</Text>
              </View>
            </View>
            <View style={styles.optionRight}>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem}>
            <View style={styles.optionLeft}>
              <View style={styles.optionIcon}>
                <Text style={styles.iconText}>⭐</Text>
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Avaliações</Text>
                <Text style={styles.optionSubtitle}>Suas avaliações</Text>
              </View>
            </View>
            <View style={styles.optionRight}>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Seção de configurações */}
        <View style={styles.optionsSection}>
          <Text style={styles.sectionTitle}>Configurações</Text>
          
          <TouchableOpacity style={styles.optionItem}>
            <View style={styles.optionLeft}>
              <View style={styles.optionIcon}>
                <Text style={styles.iconText}>🔔</Text>
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Notificações</Text>
                <Text style={styles.optionSubtitle}>Gerencie suas notificações</Text>
              </View>
            </View>
            <View style={styles.optionRight}>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem}>
            <View style={styles.optionLeft}>
              <View style={styles.optionIcon}>
                <Text style={styles.iconText}>🔒</Text>
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Privacidade</Text>
                <Text style={styles.optionSubtitle}>Configurações de privacidade</Text>
              </View>
            </View>
            <View style={styles.optionRight}>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem}>
            <View style={styles.optionLeft}>
              <View style={styles.optionIcon}>
                <Text style={styles.iconText}>❓</Text>
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Ajuda</Text>
                <Text style={styles.optionSubtitle}>Central de ajuda</Text>
              </View>
            </View>
            <View style={styles.optionRight}>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Botão de logout */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={async () => {
              await AsyncStorage.removeItem('jwtToken');
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            }}
          >
            <Text style={styles.logoutButtonText}>Sair da Conta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#e5293e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 40,
    color: '#fff',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5293e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  editAvatarText: {
    fontSize: 14,
    color: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
  },
  optionsSection: {
    backgroundColor: '#fff',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 20,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  optionRight: {
    marginLeft: 12,
  },
  chevron: {
    fontSize: 20,
    color: '#ccc',
    fontWeight: 'bold',
  },
  logoutSection: {
    backgroundColor: '#fff',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  logoutButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dc3545',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#dc3545',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PerfilScreen;

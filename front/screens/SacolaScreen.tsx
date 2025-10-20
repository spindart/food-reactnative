import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { useCart } from '../context/CartContext';
import { useNavigation } from '@react-navigation/native';
import { getEstabelecimentoById } from '../services/estabelecimentoService';

const SacolaScreen: React.FC = () => {
  const { state: cartState, dispatch } = useCart();
  const navigation = useNavigation();
  const [taxaEntrega, setTaxaEntrega] = useState(0);
  const [estabelecimento, setEstabelecimento] = useState<any>(null);
  const [suggestedItems, setSuggestedItems] = useState([
    {
      id: '1',
      nome: 'Combo kids',
      preco: 21.90,
      imagem: 'https://via.placeholder.com/150x150/FFE4B5/8B4513?text=Combo+Kids',
      descricao: '2 pastéis + bebida + Fini Beijos'
    },
    {
      id: '2', 
      nome: 'Creme de Ninho com Nutella',
      preco: 19.90,
      imagem: 'https://via.placeholder.com/150x150/DEB887/8B4513?text=Creme+Ninho',
      descricao: 'Pastel com creme de ninho e nutella'
    },
    {
      id: '3',
      nome: 'Ovomaltine',
      preco: 18.90,
      imagem: 'https://via.placeholder.com/150x150/F4A460/8B4513?text=Ovomaltine',
      descricao: 'Pastel com ovomaltine'
    }
  ]);

  const cartItems = cartState.items;

  useEffect(() => {
    // Descobrir o estabelecimento do primeiro item do carrinho
    if (cartItems.length > 0) {
      const estId = cartItems[0].estabelecimentoId;
      if (estId) {
        getEstabelecimentoById(String(estId)).then((est) => {
          if (est) {
            setEstabelecimento(est);
            if (est.taxaEntrega !== undefined && est.taxaEntrega !== null) {
              setTaxaEntrega(Number(est.taxaEntrega));
            }
          }
        });
      }
    } else {
      setTaxaEntrega(0);
      setEstabelecimento(null);
    }
  }, [cartItems]);

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + item.preco * item.quantidade, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal + taxaEntrega;
  };

  const handleAddSuggestedItem = (item: any) => {
    dispatch({ type: 'ADD_ITEM', payload: { ...item, quantidade: 1 } });
  };

  const handleRemoveItem = (itemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: itemId });
  };

  const handleUpdateQuantity = (itemId: string, change: number) => {
    const item = cartItems.find(i => i.id === itemId);
    if (item) {
      dispatch({ type: 'ADD_ITEM', payload: { ...item, quantidade: change } });
    }
  };

  const handleClearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const handleContinue = () => {
    if (cartItems.length === 0) {
      return;
    }
    navigation.navigate('EnderecoEntrega' as never);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SACOLA</Text>
        <TouchableOpacity onPress={handleClearCart}>
          <Text style={styles.clearButton}>Limpar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Restaurant Info */}
        <View style={styles.restaurantSection}>
          <View style={styles.restaurantInfo}>
            <View style={styles.restaurantLogo}>
              <Text style={styles.logoText}>{estabelecimento?.nome?.toUpperCase() || 'ESTABELECIMENTO'}</Text>
            </View>
            <View style={styles.restaurantDetails}>
              <Text style={styles.restaurantName}>{estabelecimento?.nome || 'Estabelecimento'}</Text>
              <TouchableOpacity onPress={() => estabelecimento && (navigation as any).navigate('ProdutosDoEstabelecimento', { estabelecimento })}>
                <Text style={styles.addMoreItems}>Adicionar mais itens</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Added Items */}
        {cartItems.length > 0 && (
          <View style={styles.addedItemsSection}>
            <Text style={styles.sectionTitle}>Itens adicionados</Text>
            {cartItems.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                  <Image source={{ uri: (item as any).imagem || 'https://via.placeholder.com/80x80' }} style={styles.itemImage} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.nome}</Text>
                  <Text style={styles.itemPrice}>R$ {item.preco.toFixed(2)}</Text>
                </View>
                <View style={styles.quantityControls}>
                  <TouchableOpacity 
                    style={styles.quantityButton}
                    onPress={() => item.quantidade === 1 ? handleRemoveItem(item.id) : handleUpdateQuantity(item.id, -1)}
                  >
                    <Text style={styles.quantityButtonText}>
                      {item.quantidade === 1 ? '🗑️' : '-'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{item.quantidade}</Text>
                  <TouchableOpacity 
                    style={styles.quantityButton}
                    onPress={() => handleUpdateQuantity(item.id, 1)}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity onPress={() => estabelecimento && (navigation as any).navigate('ProdutosDoEstabelecimento', { estabelecimento })}>
              <Text style={styles.addMoreItems}>Adicionar mais itens</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Suggested Items */}
        {/* <View style={styles.suggestedSection}>
          <Text style={styles.sectionTitle}>Peça também</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestedScroll}>
            {suggestedItems.map((item) => (
              <TouchableOpacity key={item.id} style={styles.suggestedItem} onPress={() => handleAddSuggestedItem(item)}>
                <Image source={{ uri: item.imagem }} style={styles.suggestedImage} />
                <TouchableOpacity style={styles.addButton}>
                  <Text style={styles.addButtonText}>+</Text>
                </TouchableOpacity>
                <Text style={styles.suggestedPrice}>R$ {item.preco.toFixed(2)}</Text>
                <Text style={styles.suggestedName}>{item.nome}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View> */}

        {/* Coupon Section */}
        {/* <View style={styles.couponSection}>
          <View style={styles.couponInfo}>
            <Text style={styles.couponIcon}>🎫</Text>
            <View style={styles.couponDetails}>
              <Text style={styles.couponTitle}>Cupom</Text>
              <Text style={styles.couponDescription}>1 do Clube para usar nessa loja</Text>
            </View>
          </View>
          <TouchableOpacity>
            <Text style={styles.addCouponButton}>Adicionar</Text>
          </TouchableOpacity>
        </View> */}

        {/* Value Summary */}
        <View style={styles.valueSummarySection}>
          <Text style={styles.sectionTitle}>Resumo de valores</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>R$ {calculateSubtotal().toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Taxa de entrega</Text>
            <Text style={styles.summaryValue}>R$ {taxaEntrega.toFixed(2)}</Text>
          </View>
          {/* <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Taxa de serviço ?</Text>
            <Text style={styles.summaryValue}>R$ 0,99</Text>
          </View> */}
          <View style={styles.summaryRowFinal}>
            <Text style={styles.summaryLabelFinal}>Total</Text>
            <Text style={styles.summaryValueFinal}>R$ {calculateTotal().toFixed(2)}</Text>
          </View>
          {/* <View style={styles.discountRow}>
            <Text style={styles.discountText}>Aplique seu cupom e pague</Text>
            <View style={styles.discountValue}>
              <Text style={styles.discountIcon}>💎</Text>
              <Text style={styles.discountAmount}>R$ 23,16</Text>
            </View>
          </View> */}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerContent}>
          <View style={styles.footerTotal}>
            <Text style={styles.footerTotalLabel}>Total com a entrega</Text>
            <Text style={styles.footerTotalValue}>R$ {calculateTotal().toFixed(2)} / {cartItems.length} item{cartItems.length > 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.continueButton,
              { backgroundColor: cartItems.length === 0 ? '#ccc' : '#e5293e' }
            ]}
            onPress={handleContinue}
            disabled={cartItems.length === 0}
          >
            <Text style={styles.continueButtonText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    fontSize: 24,
    color: '#e5293e',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  clearButton: {
    fontSize: 16,
    color: '#e5293e',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    paddingBottom: 100,
  },
  restaurantSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restaurantLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5DEB3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#8B4513',
    textAlign: 'center',
  },
  restaurantDetails: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  addMoreItems: {
    fontSize: 14,
    color: '#e5293e',
    fontWeight: '600',
  },
  addedItemsSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: '#e5293e',
    fontWeight: 'bold',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  quantityButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e5293e',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 8,
    minWidth: 20,
    textAlign: 'center',
  },
  suggestedSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  suggestedScroll: {
    marginTop: 12,
  },
  suggestedItem: {
    width: 150,
    marginRight: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  suggestedImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  addButton: {
    position: 'absolute',
    bottom: 40,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5293e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  suggestedPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e5293e',
    marginBottom: 4,
  },
  suggestedName: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  couponSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  couponInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  couponIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  couponDetails: {
    flex: 1,
  },
  couponTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  couponDescription: {
    fontSize: 14,
    color: '#8B5CF6',
  },
  addCouponButton: {
    fontSize: 16,
    color: '#e5293e',
    fontWeight: '600',
  },
  valueSummarySection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  summaryLabelFinal: {
    fontSize: 18,
    color: '#333',
    fontWeight: 'bold',
  },
  summaryValueFinal: {
    fontSize: 18,
    color: '#e5293e',
    fontWeight: 'bold',
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
  discountText: {
    fontSize: 14,
    color: '#666',
  },
  discountValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  discountAmount: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingBottom: 34,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  footerTotal: {
    flex: 1,
  },
  footerTotalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  footerTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  continueButton: {
    backgroundColor: '#e5293e',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minWidth: 120,
    alignItems: 'center',
    shadowColor: '#e5293e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SacolaScreen;

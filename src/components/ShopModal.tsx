import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, Image } from 'react-native';
import { Shop, ShopItem } from '../services/shopService';
import { currencyService } from '../services/currencyService';
import { firebaseInventoryService } from '../services/firebaseInventoryService';

interface ShopModalProps {
  visible: boolean;
  shop: Shop | null;
  userId: string;
  onClose: () => void;
  onPurchase: (updatedShop: Shop) => void;
}

const ShopModal: React.FC<ShopModalProps> = ({ visible, shop, userId, onClose, onPurchase }) => {
  const [purchasing, setPurchasing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pokeball' | 'berry' | 'map-lure' | 'xp-boost'>('pokeball');
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [quantity, setQuantity] = useState(1);

  if (!shop) return null;

  const handlePurchase = async (item: ShopItem, qty: number) => {
    if (item.stock < qty) return;
    
    setPurchasing(true);
    try {
      const totalPrice = item.price * qty;
      const success = await currencyService.deductCoins(userId, totalPrice);
      if (!success) {
        Alert.alert('Insufficient Coins', `You need ${totalPrice} coins to buy ${qty}x ${item.name}.`);
        setPurchasing(false);
        return;
      }

      await firebaseInventoryService.addItem(userId, item.id, qty);
      
      if (shop) {
        const updatedShop = {
          ...shop,
          items: shop.items.map(i => 
            i.id === item.id ? { ...i, stock: i.stock - qty } : i
          )
        };
        onPurchase(updatedShop);
      }
      
      setSelectedItem(null);
      setQuantity(1);
      Alert.alert('Purchase Successful', `You bought ${qty}x ${item.name}!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to complete purchase.');
    }
    setPurchasing(false);
  };

  const getShopTitle = () => {
    if (!shop) return 'Shop';
    const titles = { mart: 'Poké Mart', berry: 'Berry Shop', general: 'General Store', premium: 'Premium Shop' };
    return titles[shop.type];
  };

  const filteredItems = shop?.items.filter(item => item.category === activeTab) || [];

  return (
    <>
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{getShopTitle()}</Text>
              <Text style={styles.subtitle}>{filteredItems.length} items available</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity style={[styles.tab, activeTab === 'pokeball' && styles.tabActive]} onPress={() => setActiveTab('pokeball')}>
              <Text style={[styles.tabText, activeTab === 'pokeball' && styles.tabTextActive]}>Balls</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === 'berry' && styles.tabActive]} onPress={() => setActiveTab('berry')}>
              <Text style={[styles.tabText, activeTab === 'berry' && styles.tabTextActive]}>Berries</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === 'map-lure' && styles.tabActive]} onPress={() => setActiveTab('map-lure')}>
              <Text style={[styles.tabText, activeTab === 'map-lure' && styles.tabTextActive]}>Lures</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === 'xp-boost' && styles.tabActive]} onPress={() => setActiveTab('xp-boost')}>
              <Text style={[styles.tabText, activeTab === 'xp-boost' && styles.tabTextActive]}>XP</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.itemList}>
            {filteredItems.map(item => (
                <View key={item.id} style={[styles.itemCard, item.stock === 0 && styles.itemCardSoldOut]}>
                  {item.sprite ? (
                    <Image source={{ uri: item.sprite }} style={styles.itemSprite} />
                  ) : (
                    <View style={styles.itemIconPlaceholder}>
                      <Text style={styles.itemIconText}>{item.icon}</Text>
                    </View>
                  )}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemDescription}>{item.description}</Text>
                    <Text style={styles.itemPrice}>💰 {item.price} coins</Text>
                  </View>
                  <View style={styles.itemActions}>
                    <Text style={styles.stockBadge}>x{item.stock}</Text>
                    <View style={styles.buyButtons}>
                      <TouchableOpacity
                        style={[styles.buyButton, item.stock === 0 && styles.buyButtonDisabled]}
                        onPress={() => handlePurchase(item, 1)}
                        disabled={purchasing || item.stock === 0}
                      >
                        <Text style={styles.buyText}>{item.stock > 0 ? 'BUY' : 'OUT'}</Text>
                      </TouchableOpacity>
                      {item.stock > 1 && (
                        <TouchableOpacity
                          style={styles.bulkButton}
                          onPress={() => { setSelectedItem(item); setQuantity(Math.min(5, item.stock)); }}
                          disabled={purchasing}
                        >
                          <Text style={styles.bulkText}>BULK</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))}
          </ScrollView>
        </View>
      </View>
    </Modal>

    <Modal visible={!!selectedItem} transparent animationType="fade">
      <View style={styles.bulkOverlay}>
        <View style={styles.bulkModal}>
          <Text style={styles.bulkTitle}>Buy {selectedItem?.name}</Text>
          <Text style={styles.bulkSubtitle}>Stock: {selectedItem?.stock}</Text>
          
          <View style={styles.quantityContainer}>
            <TouchableOpacity style={styles.quantityButton} onPress={() => setQuantity(Math.max(1, quantity - 1))}>
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity style={styles.quantityButton} onPress={() => setQuantity(Math.min(selectedItem?.stock || 1, quantity + 1))}>
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.bulkPrice}>💰 {(selectedItem?.price || 0) * quantity} coins</Text>

          <View style={styles.bulkActions}>
            <TouchableOpacity style={styles.bulkCancelButton} onPress={() => { setSelectedItem(null); setQuantity(1); }}>
              <Text style={styles.bulkCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bulkConfirmButton} onPress={() => selectedItem && handlePurchase(selectedItem, quantity)} disabled={purchasing}>
              <Text style={styles.bulkConfirmText}>Buy {quantity}x</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#F8F8F8', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', borderWidth: 4, borderColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 3, borderBottomColor: '#000' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#000', letterSpacing: 1 },
  subtitle: { fontSize: 12, color: '#666', marginTop: 4 },
  closeButton: { padding: 8 },
  closeText: { fontSize: 24, color: '#000', fontWeight: 'bold' },
  tabs: { flexDirection: 'row', borderBottomWidth: 3, borderBottomColor: '#000' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#E0E0E0' },
  tabActive: { backgroundColor: '#F8F8F8' },
  tabText: { fontSize: 11, fontWeight: 'bold', color: '#666' },
  tabTextActive: { color: '#000' },
  itemList: { padding: 16, minHeight: 200 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: '#999', marginBottom: 8 },
  emptySubtext: { fontSize: 12, color: '#999' },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 3, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
  itemCardSoldOut: { opacity: 0.5, borderColor: '#999' },
  itemIconPlaceholder: { width: 40, height: 40, marginRight: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F0F0', borderRadius: 8 },
  itemIconText: { fontSize: 24 },
  itemSprite: { width: 40, height: 40, marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: 'bold', color: '#000' },
  itemDescription: { fontSize: 11, color: '#666', marginTop: 2 },
  itemPrice: { fontSize: 12, color: '#FFD700', marginTop: 4, fontWeight: 'bold' },
  itemActions: { alignItems: 'flex-end' },
  stockBadge: { fontSize: 10, color: '#4CAF50', marginBottom: 4, fontWeight: 'bold', backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  buyButtons: { flexDirection: 'row', gap: 4 },
  buyButton: { backgroundColor: '#4CAF50', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 3, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0 },
  buyButtonDisabled: { backgroundColor: '#999', borderColor: '#666' },
  buyText: { fontSize: 12, fontWeight: 'bold', color: '#FFF', letterSpacing: 1 },
  bulkButton: { backgroundColor: '#2196F3', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 3, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0 },
  bulkText: { fontSize: 10, fontWeight: 'bold', color: '#FFF', letterSpacing: 1 },
  bulkOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  bulkModal: { backgroundColor: '#F8F8F8', borderRadius: 16, padding: 24, width: '80%', borderWidth: 4, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 },
  bulkTitle: { fontSize: 20, fontWeight: 'bold', color: '#000', textAlign: 'center', marginBottom: 8 },
  bulkSubtitle: { fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 20 },
  quantityContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  quantityButton: { backgroundColor: '#E0E0E0', width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#000' },
  quantityButtonText: { fontSize: 24, fontWeight: 'bold', color: '#000' },
  quantityText: { fontSize: 32, fontWeight: 'bold', color: '#000', marginHorizontal: 30 },
  bulkPrice: { fontSize: 18, fontWeight: 'bold', color: '#FFD700', textAlign: 'center', marginBottom: 20 },
  bulkActions: { flexDirection: 'row', gap: 12 },
  bulkCancelButton: { flex: 1, backgroundColor: '#999', paddingVertical: 12, borderRadius: 8, borderWidth: 3, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0 },
  bulkCancelText: { fontSize: 14, fontWeight: 'bold', color: '#FFF', textAlign: 'center', letterSpacing: 1 },
  bulkConfirmButton: { flex: 1, backgroundColor: '#4CAF50', paddingVertical: 12, borderRadius: 8, borderWidth: 3, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0 },
  bulkConfirmText: { fontSize: 14, fontWeight: 'bold', color: '#FFF', textAlign: 'center', letterSpacing: 1 },
});

export default ShopModal;

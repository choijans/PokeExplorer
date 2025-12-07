import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Modal, Alert, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Text, useTheme, ActivityIndicator, Button } from 'react-native-paper';
import { pokemonInstanceService, PokemonInstance } from '../services/pokemonInstanceService';
import { pricingService } from '../services/pricingService';
import { currencyService } from '../services/currencyService';
import { useAuth } from '../contexts/AuthContext';
import type { PokemonTheme } from '../theme';

interface GroupedPokemon {
  pokemonId: number;
  name: string;
  sprite: string;
  rarity: string;
  instances: PokemonInstance[];
  totalWeight: number;
  catchCount: number;
}

const InventoryTab: React.FC = () => {
  const theme = useTheme<PokemonTheme>();
  const { user } = useAuth();
  const [grouped, setGrouped] = useState<GroupedPokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPokemon, setSelectedPokemon] = useState<GroupedPokemon | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (user) loadInventory();
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      if (user) loadInventory();
    }, [user])
  );

  const loadInventory = async () => {
    if (!user) return;
    try {
      const instances = await pokemonInstanceService.getCaughtInstances(user.uid);
      const grouped = groupByPokemon(instances);
      setGrouped(grouped);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupByPokemon = (instances: PokemonInstance[]): GroupedPokemon[] => {
    const map = new Map<number, GroupedPokemon>();
    
    instances.forEach(instance => {
      if (!map.has(instance.pokemonId)) {
        map.set(instance.pokemonId, {
          pokemonId: instance.pokemonId,
          name: instance.name,
          sprite: instance.sprite,
          rarity: instance.rarity,
          instances: [],
          totalWeight: 0,
          catchCount: 0,
        });
      }
      const group = map.get(instance.pokemonId)!;
      group.instances.push(instance);
      group.totalWeight += instance.weight;
      group.catchCount++;
    });

    return Array.from(map.values()).sort((a, b) => b.catchCount - a.catchCount);
  };

  const handleSellInstance = async (instance: PokemonInstance) => {
    if (!user) return;
    const price = pricingService.calculatePrice(instance.weight, instance.rarity);
    
    Alert.alert(
      'Sell Pokémon',
      `Sell ${instance.name} (${instance.weight} kg) for ${price.toLocaleString()} coins?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sell',
          onPress: async () => {
            await pokemonInstanceService.deleteInstance(user.uid, instance.id);
            await currencyService.addCoins(user.uid, price);
            await loadInventory();
            setModalVisible(false);
            Alert.alert('Success', `Sold for ${price.toLocaleString()} coins!`);
          },
        },
      ]
    );
  };

  const handleSellAll = async (pokemon: GroupedPokemon) => {
    if (!user) return;
    const totalPrice = pricingService.calculateBulkPrice(pokemon.instances);
    
    Alert.alert(
      'Sell All',
      `Sell all ${pokemon.catchCount} ${pokemon.name} for ${totalPrice.toLocaleString()} coins?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sell All',
          onPress: async () => {
            for (const instance of pokemon.instances) {
              await pokemonInstanceService.deleteInstance(user.uid, instance.id);
            }
            await currencyService.addCoins(user.uid, totalPrice);
            await loadInventory();
            setModalVisible(false);
            Alert.alert('Success', `Sold all for ${totalPrice.toLocaleString()} coins!`);
          },
        },
      ]
    );
  };

  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      common: '#4CAF50',
      uncommon: '#2196F3',
      rare: '#9C27B0',
      epic: '#FF9800',
      legendary: '#FFD700',
    };
    return colors[rarity] || '#888';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (grouped.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
          No Pokémon caught yet. Start hunting!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={grouped}
        keyExtractor={(item) => item.pokemonId.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              setSelectedPokemon(item);
              setModalVisible(true);
            }}
          >
            <View style={styles.cardContent}>
              <Image source={{ uri: item.sprite }} style={styles.sprite} />
              <View style={styles.info}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, textTransform: 'capitalize' }}>
                  {item.name}
                </Text>
                <Text variant="bodySmall" style={{ color: getRarityColor(item.rarity), fontWeight: 'bold' }}>
                  {item.rarity.toUpperCase()}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Caught: {item.catchCount} times • {item.totalWeight.toFixed(2)} kg total
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            {selectedPokemon && (
              <>
                <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, textTransform: 'capitalize', marginBottom: 16 }}>
                  {selectedPokemon.name} Instances
                </Text>
                <FlatList
                  data={selectedPokemon.instances}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item, index }) => (
                    <View style={styles.instanceCard}>
                      <View style={styles.instanceInfo}>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                          #{index + 1} - {item.weight} kg
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {new Date(item.capturedAt).toLocaleDateString()}
                        </Text>
                        <Text variant="bodySmall" style={{ color: '#FFD700', fontWeight: 'bold' }}>
                          💰 {pricingService.calculatePrice(item.weight, item.rarity).toLocaleString()} coins
                        </Text>
                      </View>
                      <Button mode="contained" onPress={() => handleSellInstance(item)}>
                        SELL
                      </Button>
                    </View>
                  )}
                  style={{ maxHeight: 300 }}
                />
                <View style={styles.modalActions}>
                  <Button mode="contained-tonal" onPress={() => handleSellAll(selectedPokemon)} style={{ flex: 1 }}>
                    SELL ALL ({pricingService.calculateBulkPrice(selectedPokemon.instances).toLocaleString()})
                  </Button>
                  <Button mode="outlined" onPress={() => setModalVisible(false)} style={{ flex: 1 }}>
                    CLOSE
                  </Button>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 12, borderRadius: 12, padding: 16 },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sprite: { width: 64, height: 64 },
  info: { flex: 1, gap: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 20, padding: 20, maxHeight: '80%' },
  instanceCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 8, marginBottom: 8 },
  instanceInfo: { flex: 1, gap: 2 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
});

export default InventoryTab;

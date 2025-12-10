import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { discoveryService, DiscoveredPokemon } from '../services/discoveryService';
import { firebaseDiscoveryService } from '../services/firebaseDiscoveryService';
import { pokeApi, Pokemon } from '../services/pokeApi';
import { pokemonInstanceService } from '../services/pokemonInstanceService';
import PokemonCard from '../components/PokemonCard';
import InventoryTab from '../components/InventoryTab';
import Screen from '../components/ui/Screen';
import SectionCard from '../components/ui/SectionCard';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import type { PokemonTheme } from '../theme';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const CollectionScreen: React.FC = () => {
  const theme = useTheme<PokemonTheme>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const [discovered, setDiscovered] = useState<DiscoveredPokemon[]>([]);
  const [pokemonData, setPokemonData] = useState<{ [key: number]: Pokemon }>({});
  const [catchCounts, setCatchCounts] = useState<{ [key: number]: number }>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pokedex' | 'inventory'>('pokedex');

  useFocusEffect(
    React.useCallback(() => {
      loadDiscoveredPokemon();
    }, [user])
  );

  const loadDiscoveredPokemon = async () => {
    try {
      let discoveredList: any[] = [];
      if (user) {
        const captured = await firebaseDiscoveryService.getCapturedPokemon(user.uid);
        discoveredList = captured.map(c => ({
          id: c.id,
          name: c.name,
          count: c.count,
          discoveredAt: c.firstCapturedAt,
          biome: '',
        }));
      } else {
        discoveredList = await discoveryService.getDiscoveredPokemon();
      }
      setDiscovered(discoveredList);

      const pokemonDataMap: { [key: number]: Pokemon } = {};
      const counts: { [key: number]: number } = {};
      
      const promises = discoveredList.map(async (item) => {
        try {
          const pokemon = await pokeApi.getPokemon(item.id);
          pokemonDataMap[item.id] = pokemon;
          
          if (user) {
            const count = await pokemonInstanceService.getCatchCount(user.uid, item.id);
            counts[item.id] = count;
          }
        } catch (error) {
          console.error(`Failed to load Pokemon ${item.id}:`, error);
        }
      });
      
      await Promise.all(promises);
      setPokemonData(pokemonDataMap);
      setCatchCounts(counts);
    } catch (error) {
      console.error('Error loading discovered Pokemon:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderDiscoveredItem = ({ item }: { item: DiscoveredPokemon }) => {
    const pokemon = pokemonData[item.id];
    if (!pokemon) return null;
    const catchCount = catchCounts[item.id] || 0;

    return (
      <View style={styles.cardWrapper}>
        <PokemonCard
          pokemon={pokemon}
          isDiscovered
          onPress={() => navigation.getParent()?.navigate('PokedexDetail', { pokemon })}
        />
        <SectionCard>
          <View style={styles.discoveryInfo}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Discovered on {new Date(item.discoveredAt).toLocaleDateString()}
            </Text>
            {catchCount > 0 && (
              <Text variant="labelMedium" style={{ color: '#FFD700', fontWeight: 'bold' }}>
                ⭐ Caught {catchCount} times
              </Text>
            )}
            {item.biome && (
              <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
                Biome: {item.biome}
              </Text>
            )}
          </View>
        </SectionCard>
      </View>
    );
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator animating size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
            Loading your collection...
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={{ color: theme.colors.onSurface }}>
            My Collection
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            {discovered.length} Pokémon discovered
          </Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tab, activeTab === 'pokedex' && styles.tabActive]} onPress={() => setActiveTab('pokedex')}>
            <Text style={[styles.tabText, activeTab === 'pokedex' && styles.tabTextActive]}>POKÉDEX</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'inventory' && styles.tabActive]} onPress={() => setActiveTab('inventory')}>
            <Text style={[styles.tabText, activeTab === 'inventory' && styles.tabTextActive]}>INVENTORY</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'pokedex' ? (
          discovered.length === 0 ? (
            <SectionCard title="No Pokémon yet" subtitle="Head out on a hunt to fill your collection">
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Capture Pokémon in Hunt mode and they'll appear here as part of your Pokédex journey.
              </Text>
            </SectionCard>
          ) : (
            <FlatList
              data={discovered}
              renderItem={renderDiscoveredItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingBottom: theme.custom.spacing.xl }}
              showsVerticalScrollIndicator={false}
            />
          )
        ) : (
          <InventoryTab />
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, gap: 16 },
  header: { gap: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardWrapper: { marginBottom: 12 },
  discoveryInfo: { gap: 4 },
  tabContainer: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#333', marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: '#FFD700' },
  tabText: { fontSize: 14, fontWeight: 'bold', color: '#888' },
  tabTextActive: { color: '#FFD700' },
});

export default CollectionScreen;

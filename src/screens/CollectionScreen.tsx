import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { discoveryService, DiscoveredPokemon } from '../services/discoveryService';
import { pokeApi, Pokemon } from '../services/pokeApi';
import PokemonCard from '../components/PokemonCard';
import Screen from '../components/ui/Screen';
import SectionCard from '../components/ui/SectionCard';
import {
  ActivityIndicator,
  Text,
  useTheme,
} from 'react-native-paper';
import type { PokemonTheme } from '../theme';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const CollectionScreen: React.FC = () => {
  const theme = useTheme<PokemonTheme>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [discovered, setDiscovered] = useState<DiscoveredPokemon[]>([]);
  const [pokemonData, setPokemonData] = useState<{ [key: number]: Pokemon }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDiscoveredPokemon();
  }, []);

  const loadDiscoveredPokemon = async () => {
    try {
      const discoveredList = await discoveryService.getDiscoveredPokemon();
      setDiscovered(discoveredList);

      const pokemonDataMap: { [key: number]: Pokemon } = {};
      for (const item of discoveredList) {
        try {
          const pokemon = await pokeApi.getPokemon(item.id);
          pokemonDataMap[item.id] = pokemon;
        } catch (error) {
          console.error(`Failed to load Pokemon ${item.id}:`, error);
        }
      }
      setPokemonData(pokemonDataMap);
    } catch (error) {
      console.error('Error loading discovered Pokemon:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderDiscoveredItem = ({ item }: { item: DiscoveredPokemon }) => {
    const pokemon = pokemonData[item.id];
    if (!pokemon) return null;

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

        {discovered.length === 0 ? (
          <SectionCard title="No Pokémon yet" subtitle="Head out on a hunt to fill your collection">
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Capture Pokémon in Hunt mode and they’ll appear here as part of your Pokédex journey.
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
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
  },
  header: {
    gap: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardWrapper: {
    marginBottom: 12,
  },
  discoveryInfo: {
    gap: 4,
  },
});

export default CollectionScreen;
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { discoveryService, DiscoveredPokemon } from '../services/discoveryService';
import { pokeApi, Pokemon } from '../services/pokeApi';
import PokemonCard from '../components/PokemonCard';

const CollectionScreen: React.FC = () => {
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
      <View style={styles.itemContainer}>
        <PokemonCard pokemon={pokemon} />
        <View style={styles.discoveryInfo}>
          <Text style={styles.discoveryText}>
            Discovered: {new Date(item.discoveredAt).toLocaleDateString()}
          </Text>
          {item.biome && (
            <Text style={styles.biomeText}>Biome: {item.biome}</Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF0000" />
        <Text>Loading your collection...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Collection</Text>
      <Text style={styles.subtitle}>
        {discovered.length} Pokemon discovered
      </Text>

      {discovered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No Pokemon discovered yet!</Text>
          <Text style={styles.emptySubtext}>Go hunting to find Pokemon!</Text>
        </View>
      ) : (
        <FlatList
          data={discovered}
          renderItem={renderDiscoveredItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FF0000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  itemContainer: {
    flex: 1,
    margin: 8,
  },
  discoveryInfo: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  discoveryText: {
    fontSize: 12,
    color: '#666',
  },
  biomeText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  listContainer: {
    paddingBottom: 20,
  },
});

export default CollectionScreen;
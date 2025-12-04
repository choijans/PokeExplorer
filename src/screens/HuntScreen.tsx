import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { locationService, Location, PokemonEncounter } from '../services/locationService';
import { pokeApi, Pokemon } from '../services/pokeApi';
import { discoveryService } from '../services/discoveryService';

const HuntScreen: React.FC = () => {
  const [location, setLocation] = useState<Location | null>(null);
  const [encounters, setEncounters] = useState<PokemonEncounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [pokemonData, setPokemonData] = useState<{ [key: number]: Pokemon }>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeHunt();
      } catch (error) {
        console.error('Hunt screen initialization failed:', error);
        Alert.alert('Error', `Failed to initialize: ${error}`);
      }
    };
    init();
  }, []);

  const initializeHunt = async () => {
    setLoading(true);
    setError(null);
    try {
      const hasPermission = await locationService.requestLocationPermission();
      if (!hasPermission) {
        setError('Location permission required');
        setLoading(false);
        return;
      }

      const currentLocation = await locationService.getCurrentLocation();
      const newEncounters = locationService.generatePokemonEncounters(currentLocation);
      
      const pokemonDataMap: { [key: number]: Pokemon } = {};
      for (const encounter of newEncounters) {
        try {
          const pokemon = await pokeApi.getPokemon(encounter.id);
          pokemonDataMap[encounter.id] = pokemon;
        } catch (error) {
          console.error(`Failed to load Pokemon ${encounter.id}:`, error);
        }
      }
      
      setLocation(currentLocation);
      setEncounters(newEncounters);
      setPokemonData(pokemonDataMap);
    } catch (error: any) {
      console.error('Hunt error:', error);
      setError(error.message || 'Failed to initialize');
    } finally {
      setLoading(false);
    }
  };

  const handleEncounterPress = (encounter: PokemonEncounter) => {
    if (!location) return;

    const distance = locationService.calculateDistance(location, encounter.location);
    
    if (distance > 100) { // 100 meters
      Alert.alert(
        'Too Far Away!',
        `You need to be within 100m of the Pokemon. You are ${Math.round(distance)}m away.`
      );
      return;
    }

    const pokemon = pokemonData[encounter.id];
    if (pokemon) {
      Alert.alert(
        'Pokemon Encountered!',
        `You found a wild ${pokemon.name}!\nType: ${pokemon.types.map(t => t.type.name).join(', ')}\nBiome: ${encounter.biome}`,
        [
          { text: 'Run Away', style: 'cancel' },
          { 
            text: 'Catch!', 
            onPress: () => catchPokemon(encounter, pokemon)
          }
        ]
      );
    }
  };

  const catchPokemon = async (encounter: PokemonEncounter, pokemon: Pokemon) => {
    // Simple catch logic
    const catchSuccess = Math.random() > 0.3; // 70% success rate
    
    if (catchSuccess) {
      await discoveryService.addDiscoveredPokemon(pokemon, encounter.location, encounter.biome);
      Alert.alert('Success!', `You caught ${pokemon.name}!`);
      setEncounters(prev => 
        prev.map(enc => 
          enc.id === encounter.id ? { ...enc, discovered: true } : enc
        )
      );
    } else {
      Alert.alert('Oh no!', `${pokemon.name} escaped!`);
    }
  };

  const refreshHunt = () => {
    initializeHunt();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF0000" />
        <Text style={styles.loadingText}>Searching for Pokemon...</Text>
      </View>
    );
  }

  if (!location && !loading) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Unable to get location'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={initializeHunt}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!location) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hunt Mode</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={refreshHunt}>
          <Text style={styles.refreshButtonText}>🔄</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.listContainer}>
        <Text style={styles.locationText}>
          📍 Your Location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
        </Text>
        
        {encounters.map((encounter, index) => {
          const pokemon = pokemonData[encounter.id];
          const distance = locationService.calculateDistance(location, encounter.location);
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.encounterCard,
                encounter.discovered && styles.discoveredCard
              ]}
              onPress={() => handleEncounterPress(encounter)}
            >
              <Text style={styles.pokemonName}>
                {pokemon?.name || 'Loading...'} #{encounter.id}
              </Text>
              <Text style={styles.encounterInfo}>Biome: {encounter.biome}</Text>
              <Text style={styles.encounterInfo}>
                Distance: {Math.round(distance)}m away
              </Text>
              <Text style={styles.encounterStatus}>
                {encounter.discovered ? '✅ Caught' : distance < 100 ? '🎯 In Range!' : '🚶 Too Far'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.infoPanel}>
        <Text style={styles.infoText}>
          Pokemon Found: {encounters.filter(e => e.discovered).length}/{encounters.length}
        </Text>
        <Text style={styles.infoText}>
          Tap on Pokemon to encounter them!
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FF0000',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    fontSize: 20,
    color: '#fff',
  },

  infoPanel: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF0000',
    padding: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  encounterCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FF0000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  discoveredCard: {
    borderColor: '#00FF00',
    opacity: 0.7,
  },
  pokemonName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  encounterInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  encounterStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF0000',
    marginTop: 8,
  },
});

export default HuntScreen;
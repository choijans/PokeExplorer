import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { locationService, Location, PokemonEncounter } from '../services/locationService';
import { pokeApi, Pokemon } from '../services/pokeApi';
import { discoveryService } from '../services/discoveryService';

const HuntScreen: React.FC = () => {
  const [location, setLocation] = useState<Location | null>(null);
  const [encounters, setEncounters] = useState<PokemonEncounter[]>([]);
  const [loading, setLoading] = useState(false);
  const [pokemonData, setPokemonData] = useState<{ [key: number]: Pokemon }>({});

  useEffect(() => {
    initializeHunt();
  }, []);

  const initializeHunt = async () => {
    setLoading(true);
    try {
      const hasPermission = await locationService.requestLocationPermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Location permission is required to hunt Pokemon.');
        setLoading(false);
        return;
      }

      const currentLocation = await locationService.getCurrentLocation();
      setLocation(currentLocation);

      const newEncounters = locationService.generatePokemonEncounters(currentLocation);
      setEncounters(newEncounters);

      // Load Pokemon data for encounters
      const pokemonDataMap: { [key: number]: Pokemon } = {};
      for (const encounter of newEncounters) {
        try {
          const pokemon = await pokeApi.getPokemon(encounter.id);
          pokemonDataMap[encounter.id] = pokemon;
        } catch (error) {
          console.error(`Failed to load Pokemon ${encounter.id}:`, error);
        }
      }
      setPokemonData(pokemonDataMap);
    } catch (error) {
      console.error('Hunt initialization error:', error);
      Alert.alert('Error', 'Failed to initialize hunt mode. Please try again.');
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

  if (!location) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to get your location</Text>
        <TouchableOpacity style={styles.retryButton} onPress={initializeHunt}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hunt Mode</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={refreshHunt}>
          <Text style={styles.refreshButtonText}>🔄</Text>
        </TouchableOpacity>
      </View>

      <MapView
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {encounters.map((encounter, index) => {
          const pokemon = pokemonData[encounter.id];
          return (
            <Marker
              key={index}
              coordinate={encounter.location}
              title={pokemon?.name || 'Unknown Pokemon'}
              description={`Biome: ${encounter.biome}`}
              onPress={() => handleEncounterPress(encounter)}
              pinColor={encounter.discovered ? '#00FF00' : '#FF0000'}
            />
          );
        })}
      </MapView>

      <View style={styles.infoPanel}>
        <Text style={styles.infoText}>
          Pokemon Found: {encounters.filter(e => e.discovered).length}/{encounters.length}
        </Text>
        <Text style={styles.infoText}>
          Tap on red markers to encounter Pokemon!
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
  map: {
    flex: 1,
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
});

export default HuntScreen;
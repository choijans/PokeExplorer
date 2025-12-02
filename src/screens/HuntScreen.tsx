import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Text } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Platform } from 'react-native';

interface PokemonSpawn {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  biome: string;
}

const BIOMES = ['urban', 'water', 'forest', 'mountain'];
const POKEMON_BY_BIOME: Record<string, string[]> = {
  urban: ['pidgey', 'rattata', 'meowth'],
  water: ['magikarp', 'psyduck', 'squirtle'],
  forest: ['bulbasaur', 'caterpie', 'weedle'],
  mountain: ['geodude', 'onix', 'machop'],
};

const HuntScreen: React.FC = () => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [spawns, setSpawns] = useState<PokemonSpawn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE 
        : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
      
      const result = await request(permission);
      
      if (result === RESULTS.GRANTED) {
        getCurrentLocation();
      } else {
        Alert.alert('Permission Denied', 'Location permission is required for Hunt Mode');
        setLoading(false);
      }
    } catch (error) {
      console.error('Permission error:', error);
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
        generatePokemonSpawns(latitude, longitude);
        setLoading(false);
      },
      (error) => {
        console.error('Location error:', error);
        Alert.alert('Error', 'Unable to get your location');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const generatePokemonSpawns = (lat: number, lon: number) => {
    const newSpawns: PokemonSpawn[] = [];
    const spawnCount = Math.floor(Math.random() * 5) + 3;

    for (let i = 0; i < spawnCount; i++) {
      const offsetLat = (Math.random() - 0.5) * 0.01;
      const offsetLon = (Math.random() - 0.5) * 0.01;
      const biome = BIOMES[Math.floor(Math.random() * BIOMES.length)];
      const pokemonList = POKEMON_BY_BIOME[biome];
      const pokemon = pokemonList[Math.floor(Math.random() * pokemonList.length)];

      newSpawns.push({
        id: `${i}-${Date.now()}`,
        name: pokemon,
        latitude: lat + offsetLat,
        longitude: lon + offsetLon,
        biome,
      });
    }

    setSpawns(newSpawns);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF0000" />
        <Text style={styles.loadingText}>Finding Pokémon nearby...</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to access location</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation
        showsMyLocationButton
      >
        {spawns.map((spawn) => (
          <Marker
            key={spawn.id}
            coordinate={{ latitude: spawn.latitude, longitude: spawn.longitude }}
            title={spawn.name.toUpperCase()}
            description={`Biome: ${spawn.biome}`}
            pinColor={getBiomeColor(spawn.biome)}
          />
        ))}
      </MapView>
    </View>
  );
};

const getBiomeColor = (biome: string): string => {
  const colors: Record<string, string> = {
    urban: '#808080',
    water: '#4169E1',
    forest: '#228B22',
    mountain: '#8B4513',
  };
  return colors[biome] || '#FF0000';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#FF0000',
  },
});

export default HuntScreen;

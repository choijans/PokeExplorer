import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { locationService, Location, PokemonEncounter } from '../services/locationService';
import { pokeApi, Pokemon } from '../services/pokeApi';
import { discoveryService } from '../services/discoveryService';

const { width } = Dimensions.get('window');

const HuntScreen: React.FC = () => {
  const navigation = useNavigation();
  const [location, setLocation] = useState<Location | null>(null);
  const [encounters, setEncounters] = useState<PokemonEncounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [pokemonData, setPokemonData] = useState<{ [key: number]: Pokemon }>({});
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [locationWatcher, setLocationWatcher] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeHunt();
        const watcher = await locationService.watchLocation((newLocation) => {
          setLocation(newLocation);
        });
        setLocationWatcher(watcher);
      } catch (error) {
        console.error('Hunt initialization failed:', error);
      }
    };
    init();
    
    return () => {
      if (locationWatcher) {
        locationWatcher.remove();
      }
    };
  }, []);

  useEffect(() => {
    const checkDiscovered = async () => {
      const discovered = await discoveryService.getDiscoveredPokemon();
      const discoveredIds = discovered.map(p => p.id);
      setEncounters(prev => 
        prev.map(enc => ({
          ...enc,
          discovered: discoveredIds.includes(enc.id)
        }))
      );
    };
    
    const unsubscribe = navigation.addListener('focus', checkDiscovered);
    return unsubscribe;
  }, [navigation]);

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
    const pokemon = pokemonData[encounter.id];
    
    if (!pokemon) return;
    
    if (distance > 100) {
      return;
    }

    navigation.navigate('ARCapture', { pokemon, biome: encounter.biome });
  };

  const refreshHunt = () => {
    initializeHunt();
  };

  const calculateMapPosition = (pokemonLat: number, pokemonLng: number) => {
    if (!location) return { x: 50, y: 50 };
    const latDiff = (pokemonLat - location.latitude) * 100000;
    const lngDiff = (pokemonLng - location.longitude) * 100000;
    
    const x = 50 + (lngDiff * 5);
    const y = 50 - (latDiff * 5);
    
    return { x: Math.max(10, Math.min(90, x)), y: Math.max(10, Math.min(90, y)) };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF0000" />
        <Text style={styles.loadingText}>🔍 Searching for Pokemon...</Text>
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

  if (!location) return null;

  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; overflow: hidden; }
          #map { 
            width: 100vw; 
            height: 100vh; 
            background: linear-gradient(180deg, #87CEEB 0%, #98D8C8 100%);
            position: relative;
          }
          .player { 
            width: 50px; 
            height: 50px; 
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 40px;
            z-index: 100;
            animation: pulse 1.5s infinite;
          }
          @keyframes pulse {
            0%, 100% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.1); }
          }
          .pokemon { 
            width: 60px; 
            height: 60px; 
            position: absolute;
            transform: translate(-50%, -50%);
            cursor: pointer;
            transition: all 0.3s;
          }
          .pokemon:active {
            transform: translate(-50%, -50%) scale(1.2);
          }
          .pokemon img {
            width: 100%;
            height: 100%;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          }
          .caught {
            opacity: 0.5;
            filter: grayscale(1);
          }
          .range-circle {
            width: 200px;
            height: 200px;
            border: 3px dashed rgba(255,255,255,0.5);
            border-radius: 50%;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
          }
        </style>
      </head>
      <body>
        <div id="map">
          <div class="range-circle"></div>
          <div class="player">🧑</div>
          ${encounters.map((e, i) => {
            const pos = calculateMapPosition(e.location.latitude, e.location.longitude);
            const pokemon = pokemonData[e.id];
            const sprite = pokemon?.sprites?.front_default || '';
            return `<div class="pokemon ${e.discovered ? 'caught' : ''}" 
              style="left: ${pos.x}%; top: ${pos.y}%;" 
              onclick="window.ReactNativeWebView.postMessage('${i}')">
              ${sprite ? `<img src="${sprite}" />` : '❓'}
            </div>`;
          }).join('')}
        </div>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ Hunt Mode</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={[styles.viewButton, showMap && styles.activeButton]} 
            onPress={() => setShowMap(true)}
          >
            <Text style={[styles.viewButtonText, showMap && styles.activeButtonText]}>Map</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.viewButton, !showMap && styles.activeButton]} 
            onPress={() => setShowMap(false)}
          >
            <Text style={[styles.viewButtonText, !showMap && styles.activeButtonText]}>List</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshButton} onPress={refreshHunt}>
            <Text style={styles.refreshButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {showMap ? (
        <WebView
          source={{ html: mapHtml }}
          style={styles.webview}
          onMessage={(event) => {
            const index = parseInt(event.nativeEvent.data);
            handleEncounterPress(encounters[index]);
          }}
        />
      ) : (
        <ScrollView style={styles.listContainer}>
          <Text style={styles.locationText}>
            📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </Text>
          
          {encounters.map((encounter, index) => {
            const pokemon = pokemonData[encounter.id];
            const distance = locationService.calculateDistance(location, encounter.location);
            const inRange = distance < 100;
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.encounterCard,
                  encounter.discovered && styles.discoveredCard,
                  inRange && !encounter.discovered && styles.inRangeCard
                ]}
                onPress={() => handleEncounterPress(encounter)}
              >
                {pokemon && (
                  <Image 
                    source={{ uri: pokemon.sprites.front_default }} 
                    style={styles.pokemonSprite}
                  />
                )}
                <View style={styles.cardContent}>
                  <Text style={styles.pokemonName}>
                    {pokemon?.name || 'Loading...'} #{encounter.id}
                  </Text>
                  <Text style={styles.encounterInfo}>🌍 {encounter.biome}</Text>
                  <Text style={styles.encounterInfo}>
                    📏 {Math.round(distance)}m away
                  </Text>
                  <Text style={[
                    styles.encounterStatus,
                    inRange && !encounter.discovered && styles.inRangeStatus
                  ]}>
                    {encounter.discovered ? '✅ Caught' : inRange ? '🎯 TAP TO CATCH!' : '🚶 Too Far'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.infoPanel}>
        <Text style={styles.infoText}>
          ⭐ Caught: {encounters.filter(e => e.discovered).length}/{encounters.length}
        </Text>
        <Text style={styles.infoText}>
          {showMap ? 'Tap Pokemon on map to catch!' : 'Get within 100m to catch!'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f8ff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#FF0000' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerButtons: { flexDirection: 'row', gap: 8 },
  viewButton: { backgroundColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  activeButton: { backgroundColor: '#fff' },
  viewButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  activeButtonText: { color: '#FF0000' },
  refreshButton: { backgroundColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  refreshButtonText: { fontSize: 16, color: '#fff' },
  webview: { flex: 1 },
  listContainer: { flex: 1, padding: 16 },
  locationText: { fontSize: 14, color: '#666', marginBottom: 16, textAlign: 'center' },
  encounterCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 2, borderColor: '#ddd', flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  discoveredCard: { borderColor: '#00FF00', opacity: 0.6 },
  inRangeCard: { borderColor: '#FFD700', backgroundColor: '#FFFACD' },
  pokemonSprite: { width: 60, height: 60, marginRight: 12 },
  cardContent: { flex: 1 },
  pokemonName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4, textTransform: 'capitalize' },
  encounterInfo: { fontSize: 13, color: '#666', marginBottom: 2 },
  encounterStatus: { fontSize: 14, fontWeight: 'bold', color: '#666', marginTop: 4 },
  inRangeStatus: { color: '#FF0000', fontSize: 16 },
  infoPanel: { backgroundColor: '#fff', padding: 12, borderTopWidth: 1, borderTopColor: '#ddd' },
  infoText: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 2 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f8ff' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f8ff', padding: 20 },
  errorText: { fontSize: 18, color: '#666', textAlign: 'center', marginBottom: 20 },
  retryButton: { backgroundColor: '#FF0000', padding: 12, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default HuntScreen;
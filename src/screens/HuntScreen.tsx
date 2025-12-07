import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { locationService, Location, PokemonEncounter } from '../services/locationService';
import { pokeApi, Pokemon } from '../services/pokeApi';
import { discoveryService } from '../services/discoveryService';
import { LazyImage } from '../components/LazyImage';
import { imageCacheService } from '../services/imageCache';


const HuntScreen: React.FC = () => {
  const navigation = useNavigation();
  const [location, setLocation] = useState<Location | null>(null);
  const [encounters, setEncounters] = useState<PokemonEncounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [pokemonData, setPokemonData] = useState<{ [key: number]: Pokemon }>({});
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);
  
  useEffect(() => {
    if (showMap && location && encounters.length > 0) {
      const html = generateMapHTML(location, encounters, pokemonData);
      setMapHTML(html);
    }
  }, [showMap, encounters.length]);
  const [locationWatcher, setLocationWatcher] = useState<any>(null);
  const webViewRef = useRef<WebView>(null);

  const [mapHTML, setMapHTML] = useState<string>('');

  useEffect(() => {
    const init = async () => {
      try {
        await initializeHunt();
        const watcher = await locationService.watchLocation((newLocation) => {
          setLocation(newLocation);
          updateMapLocation(newLocation);
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
      if (spawnIntervalRef.current) {
        clearTimeout(spawnIntervalRef.current);
      }
      // Clean up despawn check
      if (despawnIntervalRef.current) {
        clearInterval(despawnIntervalRef.current);
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

  const spawnIntervalRef = useRef<any>(null);
  const despawnIntervalRef = useRef<any>(null);

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
      console.log('Got location:', currentLocation);
      
      // Initial spawn
      const newEncounters = locationService.generatePokemonEncounters(currentLocation);
      setEncounters(newEncounters);
      
      const pokemonDataMap: { [key: number]: Pokemon } = {};
      const spritesToPreload: string[] = [];
      
      for (const encounter of newEncounters) {
        try {
          const pokemon = await pokeApi.getPokemon(encounter.id);
          pokemonDataMap[encounter.id] = pokemon;
          
          if (pokemon.sprites.front_default) {
            spritesToPreload.push(pokemon.sprites.front_default);
          }
        } catch (error) {
          console.error(`Failed to load Pokemon ${encounter.id}:`, error);
        }
      }
      
      await imageCacheService.preloadImages(spritesToPreload);
      
      setLocation(currentLocation);
      setPokemonData(pokemonDataMap);
      
      setLoading(false);
      const html = generateMapHTML(currentLocation, newEncounters, pokemonDataMap);
      setMapHTML(html);

      // Spawn new Pokemon with dynamic rate based on count
      const spawnPokemon = async () => {
        setEncounters(prev => {
          // Despawn old Pokemon (5 minutes)
          const now = Date.now();
          const filtered = prev.filter(e => (now - e.spawnTime) < 300000);
          
          // Cap at 30 Pokemon
          if (filtered.length >= 30) {
            const delay = 120000; // 2 minutes when at cap
            spawnIntervalRef.current = setTimeout(spawnPokemon, delay);
            return filtered;
          }
          
          const newEncounter = locationService.generatePokemonEncounters(currentLocation)[0];
          if (newEncounter) {
            pokeApi.getPokemon(newEncounter.id).then(pokemon => {
              setPokemonData(p => ({ ...p, [newEncounter.id]: pokemon }));
              console.log('New Pokemon spawned:', pokemon.name);
            }).catch(err => console.error('Failed to spawn:', err));
            
            const updated = [...filtered, newEncounter];
            // Dynamic spawn rate: slower as count increases
            const delay = updated.length < 10 ? 20000 : updated.length < 20 ? 40000 : 80000;
            spawnIntervalRef.current = setTimeout(spawnPokemon, delay);
            return updated;
          }
          
          const delay = filtered.length < 10 ? 20000 : filtered.length < 20 ? 40000 : 80000;
          spawnIntervalRef.current = setTimeout(spawnPokemon, delay);
          return filtered;
        });
      };
      
      spawnIntervalRef.current = setTimeout(spawnPokemon, 20000);
      
      // Periodic despawn check every minute
      despawnIntervalRef.current = setInterval(() => {
        setEncounters(prev => {
          const now = Date.now();
          const filtered = prev.filter(e => (now - e.spawnTime) < 300000);
          if (filtered.length !== prev.length) {
            console.log(`Despawned ${prev.length - filtered.length} Pokemon`);
          }
          return filtered;
        });
      }, 60000);
    } catch (error: any) {
      console.error('Hunt error:', error);
      const fallbackLocation = { latitude: 10.35168, longitude: 123.91317 };
      setLocation(fallbackLocation);
      const newEncounters = locationService.generatePokemonEncounters(fallbackLocation);
      setEncounters(newEncounters);
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

    // Remove from encounters list
    setEncounters(prev => prev.filter(e => e !== encounter));
    navigation.navigate('ARCapture', { pokemon, biome: encounter.biome });
  };



  const refreshHunt = () => {
    initializeHunt();
  };

  const updateMapLocation = (newLocation: Location) => {
    if (!webViewRef.current || !showMap) return;
    webViewRef.current.injectJavaScript(`
      if (window.map && window.playerMarker) {
        window.playerMarker.setLatLng([${newLocation.latitude}, ${newLocation.longitude}]);
      }
      true;
    `);
  };

  const generateMapHTML = (loc: Location, encs: PokemonEncounter[], pokData: { [key: number]: Pokemon }) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { width: 100vw; height: 100vh; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map').setView([${loc.latitude}, ${loc.longitude}], 17);
          window.map = map;
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 19
          }).addTo(map);
          
          const playerIcon = L.divIcon({
            html: '<img src="https://play.pokemonshowdown.com/sprites/trainers/red.png" style="width:48px;height:48px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));image-rendering:pixelated;" />',
            className: '',
            iconSize: [48, 48],
            iconAnchor: [24, 24]
          });
          
          const playerMarker = L.marker([${loc.latitude}, ${loc.longitude}], { icon: playerIcon }).addTo(map);
          window.playerMarker = playerMarker;
          
          L.circle([${loc.latitude}, ${loc.longitude}], {
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.1,
            radius: 100
          }).addTo(map);
          
          ${encs.map((e, i) => {
            const pokemon = pokData[e.id];
            if (!pokemon) return '';
            return `
              const pokemonIcon${i} = L.divIcon({
                html: '<img src="${pokemon.sprites.front_default}" style="width:40px;height:40px;${e.discovered ? 'opacity:0.5;filter:grayscale(1);' : ''}" />',
                className: '',
                iconSize: [40, 40],
                iconAnchor: [20, 20]
              });
              L.marker([${e.location.latitude}, ${e.location.longitude}], { icon: pokemonIcon${i} })
                .addTo(map)
                .on('click', () => window.ReactNativeWebView.postMessage('${i}'));
            `;
          }).join('')}
        </script>
      </body>
      </html>
    `;
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
      
      {showMap && mapHTML ? (
        <WebView
          ref={webViewRef}
          source={{ html: mapHTML }}
          style={styles.map}
          onMessage={(event) => {
            const index = parseInt(event.nativeEvent.data);
            handleEncounterPress(encounters[index]);
          }}
        />
      ) : showMap ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF0000" />
        </View>
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
                  <LazyImage 
                    source={{ uri: pokemon.sprites.front_default }} 
                    style={styles.pokemonSprite}
                    showLoading={true}
                    loadingSize="small"
                    fadeInDuration={300}
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
        {showMap && (
          <Text style={styles.gpsText}>
            📍 GPS: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </Text>
        )}
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
  map: { flex: 1 },
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
  gpsText: { fontSize: 10, color: '#999', textAlign: 'center', marginTop: 4, fontFamily: 'monospace' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f8ff' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f8ff', padding: 20 },
  errorText: { fontSize: 18, color: '#666', textAlign: 'center', marginBottom: 20 },
  retryButton: { backgroundColor: '#FF0000', padding: 12, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default HuntScreen;
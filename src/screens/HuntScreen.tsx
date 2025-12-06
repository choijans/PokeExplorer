import React, { useState, useEffect, useRef } from 'react';
import {
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useTheme<PokemonTheme>();
  const [location, setLocation] = useState<Location | null>(null);
  const [encounters, setEncounters] = useState<PokemonEncounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [pokemonData, setPokemonData] = useState<{ [key: number]: Pokemon }>({});
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState<'map' | 'list'>('map');
  const [locationWatcher, setLocationWatcher] = useState<any>(null);
  const webViewRef = useRef<WebView>(null);
  const spawnIntervalRef = useRef<any>(null);
  const despawnIntervalRef = useRef<any>(null);
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
      } catch (initError) {
        console.error('Hunt initialization failed:', initError);
      }
    };
    init();

    return () => {
      if (locationWatcher) {
        locationWatcher.remove();
      }
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current);
      }
      if (despawnIntervalRef.current) {
        clearInterval(despawnIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const checkDiscovered = async () => {
      const discovered = await discoveryService.getDiscoveredPokemon();
      const discoveredIds = discovered.map((p) => p.id);
      setEncounters((prev) =>
        prev.map((enc) => ({
          ...enc,
          discovered: discoveredIds.includes(enc.id),
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
      console.log('Got location:', currentLocation);
      const newEncounters = locationService.generatePokemonEncounters(currentLocation);

      const pokemonDataMap: { [key: number]: Pokemon } = {};
      const spritesToPreload: string[] = [];

      for (const encounter of newEncounters) {
        try {
          const pokemon = await pokeApi.getPokemon(encounter.id);
          pokemonDataMap[encounter.id] = pokemon;

          if (pokemon.sprites.front_default) {
            spritesToPreload.push(pokemon.sprites.front_default);
          }
        } catch (pokemonError) {
          console.error(`Failed to load Pokemon ${encounter.id}:`, pokemonError);
        }
      }

      await imageCacheService.preloadImages(spritesToPreload);

      setLocation(currentLocation);
      setEncounters(newEncounters);
      setPokemonData(pokemonDataMap);
      
      // Generate map HTML once
      const html = generateMapHTML(currentLocation, newEncounters, pokemonDataMap);
      setMapHTML(html);
      setLoading(false);
      
      // Start spawn interval - new Pokemon every 30 seconds
      spawnIntervalRef.current = setInterval(() => {
        spawnNewPokemon(currentLocation);
      }, 30000);
      
      // Start despawn interval - remove Pokemon after 5 minutes
      despawnIntervalRef.current = setInterval(() => {
        despawnOldPokemon();
      }, 60000);
    } catch (error: any) {
      console.error('Hunt error:', error);
      // Use fallback location on error
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

    navigation.navigate('ARCapture', { pokemon, biome: encounter.biome });
  };

  const spawnNewPokemon = async (currentLocation: Location) => {
    const newEncounter = locationService.generatePokemonEncounters(currentLocation)[0];
    if (!newEncounter) return;
    
    try {
      const pokemon = await pokeApi.getPokemon(newEncounter.id);
      setPokemonData(prev => ({ ...prev, [newEncounter.id]: pokemon }));
      setEncounters(prev => [...prev, newEncounter]);
      console.log(`New Pokemon spawned: ${pokemon.name}`);
    } catch (error) {
      console.error('Failed to spawn Pokemon:', error);
    }
  };
  
  const despawnOldPokemon = () => {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    setEncounters(prev => {
      const remaining = prev.filter(e => {
        const age = now - e.spawnTime;
        if (age > fiveMinutes && !e.discovered) {
          console.log(`Pokemon ${e.id} despawned`);
          return false;
        }
        return true;
      });
      return remaining;
    });
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

  const renderEncounter = ({ item }: { item: PokemonEncounter }) => {
    const pokemon = pokemonData[item.id];
    const distance = location && locationService.calculateDistance(location, item.location);
    const inRange = typeof distance === 'number' && distance < 100;

    return (
      <Card
        mode="elevated"
        onPress={() => handleEncounterPress(item)}
        style={[
          styles.encounterCard,
          {
            borderColor: inRange ? theme.colors.primary : theme.colors.outlineVariant,
            borderWidth: inRange ? 2 : 1,
            opacity: item.discovered ? 0.6 : 1,
          },
        ]}
      >
        <Card.Content style={styles.encounterContent}>
          {pokemon && (
            <LazyImage
              source={{ uri: pokemon.sprites.front_default }}
              style={styles.pokemonSprite}
              showLoading
              loadingSize="small"
              fadeInDuration={300}
            />
          )}
          <View style={styles.encounterDetails}>
            <View style={styles.encounterHeader}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, textTransform: 'capitalize' }}>
                {pokemon?.name || 'Unknown'}
              </Text>
              {item.discovered ? (
                <Chip icon="check" compact style={styles.statusChip}>
                  Caught
                </Chip>
              ) : inRange ? (
                <Chip
                  compact
                  style={[styles.statusChip, { backgroundColor: theme.colors.primary }]}
                  textStyle={{ color: theme.colors.onPrimary }}
                >
                  In Range
                </Chip>
              ) : null}
            </View>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Biome: {item.biome}
            </Text>
            {typeof distance === 'number' && (
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {Math.round(distance)}m away
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator animating size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
            Searching for Pokémon...
          </Text>
        </View>
      </Screen>
    );
  }

  if (!location && !loading) {
    return (
      <Screen>
        <SectionCard title="Location required" subtitle={error || 'Unable to get location'}>
          <Button mode="contained" icon="refresh" onPress={initializeHunt}>
            Try Again
          </Button>
        </SectionCard>
      </Screen>
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
    </Screen>
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
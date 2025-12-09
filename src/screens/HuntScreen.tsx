import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { Card, IconButton, Chip, FAB, Portal, Button } from 'react-native-paper';
import { locationService, Location, PokemonEncounter } from '../services/locationService';
import { pokeApi, Pokemon } from '../services/pokeApi';
import { discoveryService } from '../services/discoveryService';
import { LazyImage } from '../components/LazyImage';
import { imageCacheService } from '../services/imageCache';
import { shopService, Shop } from '../services/shopService';
import ShopModal from '../components/ShopModal';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HuntScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [location, setLocation] = useState<Location | null>(null);
  const [encounters, setEncounters] = useState<PokemonEncounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [pokemonData, setPokemonData] = useState<{ [key: number]: Pokemon }>({});
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [locationWatcher, setLocationWatcher] = useState<any>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [shopVisible, setShopVisible] = useState(false);
  const [shopTimeRemaining, setShopTimeRemaining] = useState(300);
  const webViewRef = useRef<WebView>(null);
  const [mapHTML, setMapHTML] = useState<string>('');
  const spawnIntervalRef = useRef<any>(null);
  const shopIntervalRef = useRef<any>(null);
  const shopTimerRef = useRef<any>(null);

  useEffect(() => {
    if (showMap && location && encounters.length > 0) {
      const html = generateMapHTML(location, encounters, pokemonData);
      setMapHTML(html);
    }
  }, [showMap, encounters.length]);

  useEffect(() => {
    if (encounters.length > 0) {
      AsyncStorage.setItem('spawned_pokemon', JSON.stringify(encounters));
    }
  }, [encounters]);

  useEffect(() => {
    const init = async () => {
      try {
        await notificationService.requestPermission();
        await initializeHunt();
        const watcher = await locationService.watchLocation((newLocation) => {
          setLocation(newLocation);
          updateMapLocation(newLocation);
        });
        setLocationWatcher(watcher);
        
        const newShop = shopService.generateShop();
        setShop(newShop);
        setShopTimeRemaining(300);
        await notificationService.scheduleShopRefreshNotification(300000);
        
        shopTimerRef.current = setInterval(() => {
          setShopTimeRemaining(prev => prev <= 1 ? 300 : prev - 1);
        }, 1000);
        
        shopIntervalRef.current = setInterval(async () => {
          const refreshedShop = shopService.generateShop();
          setShop(refreshedShop);
          setShopTimeRemaining(300);
          await notificationService.showShopRefreshNotification();
          await notificationService.scheduleShopRefreshNotification(300000);
        }, 300000);
      } catch (error) {
        console.error('Hunt initialization failed:', error);
      }
    };
    init();
    
    return () => {
      if (locationWatcher) locationWatcher.remove();
      if (spawnIntervalRef.current) clearTimeout(spawnIntervalRef.current);
      if (shopIntervalRef.current) clearInterval(shopIntervalRef.current);
      if (shopTimerRef.current) clearInterval(shopTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const checkDiscovered = async () => {
      const discovered = await discoveryService.getDiscoveredPokemon();
      const discoveredIds = discovered.map(p => p.id);
      setEncounters(prev => prev.map(enc => ({ ...enc, discovered: discoveredIds.includes(enc.id) })));
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
      
      const saved = await AsyncStorage.getItem('spawned_pokemon');
      let initialEncounters = locationService.generatePokemonEncounters(currentLocation);
      
      if (saved) {
        const parsed = JSON.parse(saved);
        const now = Date.now();
        const valid = parsed.filter((e: PokemonEncounter) => (now - e.spawnTime) < 600000);
        if (valid.length > 0) initialEncounters = [...initialEncounters, ...valid];
      }
      
      setEncounters(initialEncounters);
      
      const pokemonDataMap: { [key: number]: Pokemon } = {};
      for (const encounter of initialEncounters) {
        try {
          const pokemon = await pokeApi.getPokemon(encounter.id);
          pokemonDataMap[encounter.id] = pokemon;
        } catch (error) {
          console.error(`Failed to load Pokemon ${encounter.id}:`, error);
        }
      }
      
      setLocation(currentLocation);
      setPokemonData(pokemonDataMap);
      setLoading(false);
      const html = generateMapHTML(currentLocation, initialEncounters, pokemonDataMap);
      setMapHTML(html);

      const spawnPokemon = async () => {
        setEncounters(prev => {
          const now = Date.now();
          const filtered = prev.filter(e => (now - e.spawnTime) < 600000);
          if (filtered.length >= 20) return filtered;
          
          const newEncounter = locationService.generatePokemonEncounters(currentLocation)[0];
          if (newEncounter) {
            pokeApi.getPokemon(newEncounter.id).then(pokemon => {
              setPokemonData(p => ({ ...p, [newEncounter.id]: pokemon }));
              console.log('New Pokemon spawned:', pokemon.name);
              
              if (newEncounter.rarity === 'rare' || newEncounter.rarity === 'legendary') {
                const dist = locationService.calculateDistance(currentLocation, newEncounter.location);
                notificationService.showRarePokemonNotification(pokemon.name, dist);
              }
            }).catch(err => console.error('Failed to spawn:', err));
            return [...filtered, newEncounter];
          }
          return filtered;
        });
        
        setEncounters(current => {
          const delay = current.length < 10 ? 15000 : current.length < 15 ? 30000 : 60000;
          spawnIntervalRef.current = setTimeout(spawnPokemon, delay);
          return current;
        });
      };
      
      spawnIntervalRef.current = setTimeout(spawnPokemon, 30000);
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
    if (!pokemon || distance > 100) return;

    const catchRecord = {
      pokemonId: encounter.id,
      timestamp: Date.now(),
      location: encounter.location,
      result: 'caught'
    };
    AsyncStorage.getItem('catch_history').then(history => {
      const records = history ? JSON.parse(history) : [];
      records.push(catchRecord);
      AsyncStorage.setItem('catch_history', JSON.stringify(records.slice(-100)));
    });
    
    setEncounters(prev => prev.filter(e => e !== encounter));
    navigation.navigate('ARCapture', { pokemon, biome: encounter.biome });
  };

  const refreshHunt = () => initializeHunt();

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
          @keyframes spawn { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.3); } 100% { transform: scale(1); opacity: 1; } }
          .spawn-anim { animation: spawn 0.6s ease-out; }
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
            const rarityGlow = e.rarity === 'legendary' ? 'filter:drop-shadow(0 0 10px gold);' : e.rarity === 'rare' ? 'filter:drop-shadow(0 0 8px purple);' : '';
            return `
              const pokemonIcon${i} = L.divIcon({
                html: '<div class="spawn-anim"><img src="${pokemon.sprites.front_default}" style="width:40px;height:40px;${rarityGlow}${e.discovered ? 'opacity:0.5;filter:grayscale(1);' : ''}" /></div>',
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
        <ActivityIndicator size="large" color="#FF5252" />
        <Text style={styles.loadingText}>Searching for Pokemon...</Text>
      </View>
    );
  }

  if (!location && !loading) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Unable to get location'}</Text>
        <Button mode="contained" onPress={initializeHunt} icon="refresh">
          Try Again
        </Button>
      </View>
    );
  }

  if (!location) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Card style={styles.header}>
        <Card.Content style={styles.headerContent}>
          <Text style={styles.title}>Hunt Mode</Text>
          <View style={styles.headerButtons}>
            <Chip selected={showMap} onPress={() => setShowMap(true)} icon="map">Map</Chip>
            <Chip selected={!showMap} onPress={() => setShowMap(false)} icon="format-list-bulleted">List</Chip>
            <IconButton icon="refresh" size={20} onPress={refreshHunt} />
          </View>
        </Card.Content>
      </Card>
      
      {showMap && mapHTML ? (
        <WebView ref={webViewRef} source={{ html: mapHTML }} style={styles.map} onMessage={(event) => {
          const index = parseInt(event.nativeEvent.data);
          handleEncounterPress(encounters[index]);
        }} />
      ) : showMap ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF0000" />
        </View>
      ) : (
        <ScrollView style={styles.listContainer}>
          <Card style={styles.locationCard}>
            <Card.Content style={styles.locationContent}>
              <IconButton icon="map-marker" size={20} />
              <Text style={styles.locationText}>{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</Text>
            </Card.Content>
          </Card>
          {encounters.map((encounter, index) => {
            const pokemon = pokemonData[encounter.id];
            const distance = locationService.calculateDistance(location, encounter.location);
            const inRange = distance < 100;
            
            return (
              <Card key={index} style={[styles.encounterCard, encounter.discovered && styles.discoveredCard, inRange && !encounter.discovered && styles.inRangeCard]} onPress={() => handleEncounterPress(encounter)}>
                <Card.Content style={styles.cardContentRow}>
                  {pokemon && <LazyImage source={{ uri: pokemon.sprites.front_default }} style={styles.pokemonSprite} showLoading={true} loadingSize="small" fadeInDuration={300} />}
                  <View style={styles.cardContent}>
                    <Text style={styles.pokemonName}>{pokemon?.name || 'Loading...'} #{encounter.id}</Text>
                    <View style={styles.chipRow}>
                      <Chip compact icon="earth">{encounter.biome}</Chip>
                      <Chip compact>{encounter.rarity}</Chip>
                      <Chip compact icon="map-marker-distance">{Math.round(distance)}m</Chip>
                    </View>
                    <Text style={[styles.encounterStatus, inRange && !encounter.discovered && styles.inRangeStatus]}>
                      {encounter.discovered ? 'Caught' : inRange ? 'TAP TO CATCH!' : 'Too Far'}
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            );
          })}
        </ScrollView>
      )}

      <Card style={styles.infoPanel}>
        <Card.Content>
          <View style={styles.infoRow}>
            <Chip icon="pokeball">{encounters.filter(e => e.discovered).length}/{encounters.length}</Chip>
            <IconButton icon="information-outline" size={20} />
            {user && shop && (
              <TouchableOpacity onPress={() => setShopVisible(true)} style={styles.shopButton}>
                <IconButton icon="store" size={28} style={styles.shopIcon} />
                <Text style={styles.shopTimer}>{formatTime(shopTimeRemaining)}</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card.Content>
      </Card>

      {user && shop && (
        <ShopModal
          visible={shopVisible}
          shop={shop}
          userId={user.uid}
          onClose={() => setShopVisible(false)}
          onPurchase={(updatedShop) => setShop(updatedShop)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { margin: 8, elevation: 4 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold' },
  headerButtons: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  shopButton: { position: 'relative', marginLeft: 8 },
  shopIcon: { margin: 0, padding: 0 },
  shopTimer: { position: 'absolute', bottom: 2, right: 2, fontSize: 10, fontWeight: 'bold', backgroundColor: '#FF5252', color: '#fff', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 10 },
  map: { flex: 1 },
  listContainer: { flex: 1, padding: 8 },
  locationCard: { margin: 8, marginBottom: 12 },
  locationContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  locationText: { fontSize: 14, color: '#666' },
  encounterCard: { margin: 8, marginBottom: 8, elevation: 2 },
  discoveredCard: { opacity: 0.6 },
  inRangeCard: { elevation: 8 },
  cardContentRow: { flexDirection: 'row', alignItems: 'center' },
  pokemonSprite: { width: 60, height: 60, marginRight: 12 },
  cardContent: { flex: 1 },
  pokemonName: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, textTransform: 'capitalize' },
  chipRow: { flexDirection: 'row', gap: 4, marginBottom: 8, flexWrap: 'wrap' },
  encounterStatus: { fontSize: 12, fontWeight: 'bold', color: '#666' },
  inRangeStatus: { color: '#FF5252', fontSize: 14 },
  infoPanel: { margin: 8, elevation: 4 },
  infoRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 20 },
  errorText: { fontSize: 18, color: '#666', textAlign: 'center', marginBottom: 20 },
});

export default HuntScreen;

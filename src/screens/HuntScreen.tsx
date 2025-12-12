import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Modal, Image, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { Card, IconButton, Chip, FAB, Portal, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { locationService, Location, PokemonEncounter } from '../services/locationService';
import { pokeApi, Pokemon } from '../services/pokeApi';
import { discoveryService } from '../services/discoveryService';
import { firebaseDiscoveryService } from '../services/firebaseDiscoveryService';
import { LazyImage } from '../components/LazyImage';
import { imageCacheService } from '../services/imageCache';
import { shopService, Shop } from '../services/shopService';
import ShopModal from '../components/ShopModal';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notificationService';
import { firebaseInventoryService } from '../services/firebaseInventoryService';
import { activeEffectsService } from '../services/activeEffectsService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HuntScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
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
  const [itemsModalVisible, setItemsModalVisible] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [activeEffects, setActiveEffects] = useState<any[]>([]);
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
    if (user) {
      firebaseInventoryService.subscribeToInventory(user.uid, (inv) => {
        console.log('Inventory loaded:', inv);
        setInventory(inv);
      });
      
      const effectInterval = setInterval(async () => {
        const effects = await activeEffectsService.getActiveEffects(user.uid);
        setActiveEffects(effects);
      }, 1000);
      
      return () => clearInterval(effectInterval);
    }
  }, [user]);

  useEffect(() => {
    const checkDiscovered = async () => {
      let discoveredIds: number[] = [];
      if (user) {
        const captured = await firebaseDiscoveryService.getCapturedPokemon(user.uid);
        discoveredIds = captured.map(p => p.id);
      } else {
        const discovered = await discoveryService.getDiscoveredPokemon();
        discoveredIds = discovered.map(p => p.id);
      }
      setEncounters(prev => prev.map(enc => ({ ...enc, discovered: discoveredIds.includes(enc.id) })));
    };
    const unsubscribe = navigation.addListener('focus', checkDiscovered);
    return unsubscribe;
  }, [navigation, user]);

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
        const effects = user ? await activeEffectsService.getActiveEffects(user.uid) : [];
        const spawnBoost = effects.find(e => e.effect.type === 'spawn-rate')?.effect.value || 0;
        
        setEncounters(prev => {
          const now = Date.now();
          const filtered = prev.filter(e => (now - e.spawnTime) < 600000);
          if (filtered.length >= 20) return filtered;
          
          const spawnCount = spawnBoost > 0 ? Math.floor(spawnBoost) : 1;
          const newEncounters = [];
          
          for (let i = 0; i < spawnCount; i++) {
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
              newEncounters.push(newEncounter);
            }
          }
          
          return [...filtered, ...newEncounters];
        });
        
        setEncounters(current => {
          let delay = current.length < 10 ? 15000 : current.length < 15 ? 30000 : 60000;
          if (spawnBoost > 0) delay = Math.max(5000, delay / 2);
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
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

      <View style={styles.bottomPanel}>
        <View style={styles.bottomRow}>
          <View style={styles.statsContainer}>
            <Text style={styles.statsLabel}>Caught</Text>
            <Text style={styles.statsValue}>{encounters.filter(e => e.discovered).length}/{encounters.length}</Text>
          </View>
          
          <TouchableOpacity style={styles.itemsButton} onPress={() => setItemsModalVisible(true)}>
            <Text style={styles.itemsButtonText}>ITEMS</Text>
            {activeEffects.length > 0 && (
              <View style={styles.activeIndicator}>
                <Text style={styles.activeCount}>{activeEffects.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          {user && shop && (
            <TouchableOpacity onPress={() => setShopVisible(true)} style={styles.shopButton}>
              <Text style={styles.shopButtonText}>SHOP</Text>
              <Text style={styles.shopTimer}>{formatTime(shopTimeRemaining)}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {user && shop && (
        <ShopModal
          visible={shopVisible}
          shop={shop}
          userId={user.uid}
          onClose={() => setShopVisible(false)}
          onPurchase={(updatedShop) => setShop(updatedShop)}
        />
      )}
      
      <Modal visible={itemsModalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.itemsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Use Items</Text>
              <TouchableOpacity onPress={() => setItemsModalVisible(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {activeEffects.length > 0 && (
              <View style={styles.activeSection}>
                <Text style={styles.sectionTitle}>ACTIVE EFFECTS</Text>
                {activeEffects.map((effect, i) => {
                  const remaining = Math.ceil((effect.expiresAt - Date.now()) / 1000);
                  return (
                    <View key={i} style={styles.activeEffectCard}>
                      <Text style={styles.activeEffectName}>{effect.itemId.toUpperCase()}</Text>
                      <Text style={styles.activeEffectTime}>{Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, '0')}</Text>
                    </View>
                  );
                })}
              </View>
            )}
            
            <Text style={styles.sectionTitle}>YOUR ITEMS</Text>
            <ScrollView style={styles.itemsScroll}>
              {inventory.length === 0 && (
                <Text style={styles.emptyText}>No items in inventory</Text>
              )}
              {inventory.filter(i => i.category === 'map-lure' || i.category === 'xp-boost').length === 0 && inventory.length > 0 && (
                <Text style={styles.emptyText}>No lures or boosters available. Buy them from the shop!</Text>
              )}
              {inventory.filter(i => i.category === 'map-lure' || i.category === 'xp-boost').map(item => {
                const getEffect = () => {
                  if (item.category === 'map-lure') {
                    return { type: 'spawn-rate' as const, value: item.id === 'basiclure' ? 1 : item.id === 'superlure' ? 2 : 1.5, duration: item.id === 'basiclure' ? 600 : item.id === 'superlure' ? 900 : 1200 };
                  }
                  return { type: (item.id === 'starpiece' ? 'coin-multiplier' : 'xp-multiplier') as const, value: item.id === 'luckyegg' ? 2.0 : item.id === 'starpiece' ? 1.5 : 3.0, duration: item.id === 'superegg' ? 900 : 1800 };
                };
                const isActive = activeEffects.some(e => e.itemId === item.id);
                
                const handleUse = async () => {
                  if (user && item.count > 0 && !isActive) {
                    await firebaseInventoryService.useItem(user.uid, item.id);
                    await activeEffectsService.activateEffect(user.uid, item.id, getEffect());
                    Alert.alert('Item Active!', `${item.name} is now active.`);
                  }
                };
                
                return (
                  <View key={item.id} style={[styles.itemCard, item.count === 0 && styles.itemCardDisabled, isActive && styles.itemCardActive]}>
                    {item.sprite ? (
                      <Image source={{ uri: item.sprite }} style={styles.itemSprite} />
                    ) : (
                      <Text style={styles.itemIcon}>{item.icon}</Text>
                    )}
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemCount}>x{item.count}</Text>
                    </View>
                    {isActive && <Text style={styles.activeTag}>✓ ACTIVE</Text>}
                    {!isActive && (
                      <TouchableOpacity style={[styles.useButton, item.count === 0 && styles.useButtonDisabled]} onPress={handleUse} disabled={item.count === 0}>
                        <Text style={styles.useButtonText}>{item.count > 0 ? 'USE' : 'OUT'}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { margin: 8, elevation: 4 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold' },
  headerButtons: { flexDirection: 'row', gap: 4, alignItems: 'center' },

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
  bottomPanel: { backgroundColor: '#F8F8F8', paddingVertical: 16, paddingHorizontal: 20, borderTopWidth: 4, borderTopColor: '#000', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 8 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  statsContainer: { flex: 1 },
  statsLabel: { fontSize: 11, fontWeight: 'bold', color: '#666', letterSpacing: 0.5, textTransform: 'uppercase' },
  statsValue: { fontSize: 20, fontWeight: 'bold', color: '#000', marginTop: 2 },
  itemsButton: { backgroundColor: '#2196F3', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, borderWidth: 3, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, position: 'relative' },
  itemsButtonText: { fontSize: 14, fontWeight: 'bold', color: '#FFF', letterSpacing: 1 },
  activeIndicator: { position: 'absolute', top: -6, right: -6, backgroundColor: '#4CAF50', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  activeCount: { fontSize: 11, fontWeight: 'bold', color: '#FFF' },
  shopButton: { backgroundColor: '#FFD700', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 3, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
  shopButtonText: { fontSize: 14, fontWeight: 'bold', color: '#000', letterSpacing: 1, textAlign: 'center' },
  shopTimer: { fontSize: 10, fontWeight: 'bold', color: '#666', textAlign: 'center', marginTop: 2 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 20 },
  errorText: { fontSize: 18, color: '#666', textAlign: 'center', marginBottom: 20 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  itemsModal: { backgroundColor: '#F8F8F8', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', borderWidth: 4, borderColor: '#000' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 3, borderBottomColor: '#000' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#000', letterSpacing: 1 },
  modalClose: { padding: 8 },
  modalCloseText: { fontSize: 24, color: '#000', fontWeight: 'bold' },
  activeSection: { padding: 16, borderBottomWidth: 3, borderBottomColor: '#000', backgroundColor: '#E8F5E9' },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#666', marginBottom: 12, letterSpacing: 1, paddingHorizontal: 16, marginTop: 16 },
  activeEffectCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 2, borderColor: '#4CAF50' },
  activeEffectName: { fontSize: 13, fontWeight: 'bold', color: '#000' },
  activeEffectTime: { fontSize: 12, fontWeight: 'bold', color: '#4CAF50' },
  itemsScroll: { padding: 16, maxHeight: 400 },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 3, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0 },
  itemCardDisabled: { opacity: 0.5, borderColor: '#999' },
  itemCardActive: { borderColor: '#4CAF50', backgroundColor: '#E8F5E9' },
  itemIcon: { fontSize: 32, marginRight: 12 },
  itemSprite: { width: 40, height: 40, marginRight: 12 },
  activeTag: { fontSize: 11, fontWeight: 'bold', color: '#4CAF50', marginRight: 8, letterSpacing: 0.5 },
  itemDetails: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: 'bold', color: '#000' },
  itemCount: { fontSize: 12, color: '#666', marginTop: 2 },
  useButton: { backgroundColor: '#4CAF50', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 3, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0 },
  useButtonDisabled: { backgroundColor: '#999', borderColor: '#666' },
  useButtonText: { fontSize: 12, fontWeight: 'bold', color: '#FFF', letterSpacing: 1 },
  emptyText: { fontSize: 14, fontWeight: 'bold', color: '#999', textAlign: 'center', padding: 20 },
});

export default HuntScreen;

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { StyleSheet, View, Image, Animated, TouchableOpacity, Text, PanResponder, Dimensions, ToastAndroid, Platform } from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { IconButton, Card, Chip, FAB, Portal, Snackbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { locationService, PokemonEncounter } from '../services/locationService';
import { pokeApi } from '../services/pokeApi';
import { socialService, Gym, Pokestop } from '../services/socialService';
import { storageCleanup } from '../services/storageCleanup';
import { pokemonSpawnService } from '../services/pokemonSpawnService';
import { shopService, Shop } from '../services/shopService';
import ShopModal from '../components/ShopModal';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../contexts/AuthContext';
import { STADIA_MAPS_API_KEY } from '@env';

const TILE_SIZE = 256;

export default function MapScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [screenDims] = useState(() => Dimensions.get('window'));
  const SCREEN_WIDTH = screenDims.width;
  const SCREEN_HEIGHT = screenDims.height;
  const [location, setLocation] = useState<any>(null);
  const [pokemon, setPokemon] = useState<PokemonEncounter[]>([]);
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonEncounter | null>(null);
  const [zoom, setZoom] = useState(20);
  const [heading, setHeading] = useState(0);
  const [mapRotation, setMapRotation] = useState(0);
  const [followMode, setFollowMode] = useState(true);
  const [nearbyExpanded, setNearbyExpanded] = useState(false);
  const [manualOffset, setManualOffset] = useState({ x: 0, y: 0 });
  const [batterySaver, setBatterySaver] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<Map<string, number>>(new Map());
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [pokestops, setPokestops] = useState<Pokestop[]>([]);
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [selectedPokestop, setSelectedPokestop] = useState<Pokestop | null>(null);
  const [spawnNotification, setSpawnNotification] = useState<string>('');
  const [newSpawns, setNewSpawns] = useState<Set<string>>(new Set());
  const [shop, setShop] = useState<Shop | null>(null);
  const [shopVisible, setShopVisible] = useState(false);
  const shopIntervalRef = useRef<any>(null);
  const nearbyHeight = useRef(new Animated.Value(60)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const playerPulse = useRef(new Animated.Value(1)).current;
  const spawnAnimations = useRef<Map<string, Animated.Value>>(new Map());
  const watcherRef = useRef<any>(null);
  const tileCache = useRef<Map<string, string>>(new Map());
  const prevLocation = useRef<any>(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(playerPulse, {
          toValue: 1.5,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(playerPulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const locationRef = useRef(location);
  const capturedPokemonRef = useRef<Set<string>>(new Set());
  
  useEffect(() => { 
    locationRef.current = location;
    if (location) pokemonSpawnService.updateLocation(location);
  }, [location]);

  useEffect(() => {
    const unsubscribe = pokemonSpawnService.subscribe(setPokemon);
    const unsubscribeNotif = pokemonSpawnService.subscribeToNotifications((pokemon) => {
      if (location) {
        const distance = locationService.calculateDistance(location, pokemon.location);
        if (distance < 500 && (pokemon.rarity === 'rare' || pokemon.rarity === 'legendary')) {
          notificationService.showRarePokemonNotification(`Pokemon #${pokemon.id}`, distance);
        }
        const key = `${pokemon.location.latitude.toFixed(6)}-${pokemon.location.longitude.toFixed(6)}`;
        setNewSpawns(prev => new Set(prev).add(key));
        const anim = new Animated.Value(0);
        spawnAnimations.current.set(key, anim);
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.delay(2000),
          Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => {
          setNewSpawns(prev => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
          spawnAnimations.current.delete(key);
        });
      }
    });
    return () => {
      unsubscribe();
      unsubscribeNotif();
    };
  }, [location]);

  useFocusEffect(
    useCallback(() => {
      storageCleanup.clearOldData();
      notificationService.requestPermission();
      
      const newShop = shopService.generateShop();
      setShop(newShop);
      notificationService.scheduleShopRefreshNotification(300000);
      
      shopIntervalRef.current = setInterval(async () => {
        const refreshedShop = shopService.generateShop();
        setShop(refreshedShop);
        await notificationService.showShopRefreshNotification();
        await notificationService.scheduleShopRefreshNotification(300000);
      }, 300000);
      
      let mounted = true;
      let intervalId: any;
      let countdownId: any;
      
      const updateLocation = () => {
        locationService.getCurrentLocation().then(loc => {
          if (mounted) {
            if (prevLocation.current) {
              const dx = loc.longitude - prevLocation.current.longitude;
              const dy = loc.latitude - prevLocation.current.latitude;
              if (Math.abs(dx) > 0.000001 || Math.abs(dy) > 0.000001) {
                const angle = Math.atan2(dx, dy) * (180 / Math.PI);
                setHeading(angle);
              }
            }
            prevLocation.current = { ...loc };
            setLocation({ ...loc });
          }
        }).catch(() => {
          if (mounted && !location) {
            const defaultLoc = { latitude: 10.35168, longitude: 123.91317 };
            setLocation(defaultLoc);
            prevLocation.current = defaultLoc;
          }
        });
      };

      socialService.getGyms().then(g => setGyms(g));
      socialService.getPokestops().then(p => setPokestops(p));

      locationService.requestLocationPermission().then(granted => {
        if (granted && mounted) {
          locationService.getCurrentLocation().then(loc => {
            if (mounted) {
              setLocation(loc);
              prevLocation.current = loc;
              pokemonSpawnService.start(loc);
            }
          }).catch(() => {
            if (mounted) {
              const defaultLoc = { latitude: 10.35168, longitude: 123.91317 };
              setLocation(defaultLoc);
              prevLocation.current = defaultLoc;
              pokemonSpawnService.start(defaultLoc);
            }
          });
          intervalId = setInterval(updateLocation, batterySaver ? 10000 : 2000);
          countdownId = setInterval(() => {
            setTimeRemaining(new Map(pokemon.map(p => [
              `${p.location.latitude.toFixed(6)}-${p.location.longitude.toFixed(6)}`,
              pokemonSpawnService.getTimeRemaining(p)
            ])));
          }, 1000);
        }
      });

      return () => {
        mounted = false;
        pokemonSpawnService.stop();
        if (intervalId) clearInterval(intervalId);
        if (countdownId) clearInterval(countdownId);
        if (shopIntervalRef.current) clearInterval(shopIntervalRef.current);
        if (watcherRef.current?.remove) {
          watcherRef.current.remove();
        }
      };
    }, [])
  );

  const latToY = useCallback((lat: number) => {
    const latRad = (lat * Math.PI) / 180;
    return (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, zoom) * TILE_SIZE;
  }, [zoom]);

  const lonToX = useCallback((lon: number) => {
    return ((lon + 180) / 360) * Math.pow(2, zoom) * TILE_SIZE;
  }, [zoom]);

  const getTileUrl = useCallback((x: number, y: number, z: number) => {
    const key = `${z}-${x}-${y}`;
    if (!tileCache.current.has(key)) {
      tileCache.current.set(key, `https://tiles.stadiamaps.com/tiles/osm_bright/${z}/${x}/${y}.png?api_key=${STADIA_MAPS_API_KEY}`);
    }
    return tileCache.current.get(key)!;
  }, []);

  const getBiomeColor = useCallback((biome: string) => {
    switch (biome) {
      case 'water': return 'rgba(100, 149, 237, 0.5)';
      case 'grass': return 'rgba(34, 139, 34, 0.5)';
      case 'urban': return 'rgba(128, 128, 128, 0.5)';
      default: return 'rgba(255, 215, 0, 0.5)';
    }
  }, []);

  const mapOffset = useMemo(() => {
    if (!location) return { x: 0, y: 0 };
    const centerX = lonToX(location.longitude) - manualOffset.x;
    const centerY = latToY(location.latitude) - manualOffset.y;
    return { x: centerX, y: centerY };
  }, [location, manualOffset, lonToX, latToY]);

  const tiles = useMemo(() => {
    if (!location) return [];

    const startTileX = Math.floor((mapOffset.x - SCREEN_WIDTH / 2) / TILE_SIZE);
    const startTileY = Math.floor((mapOffset.y - SCREEN_HEIGHT / 2) / TILE_SIZE);
    const endTileX = Math.ceil((mapOffset.x + SCREEN_WIDTH / 2) / TILE_SIZE);
    const endTileY = Math.ceil((mapOffset.y + SCREEN_HEIGHT / 2) / TILE_SIZE);

    const result = [];
    for (let x = startTileX; x <= endTileX; x++) {
      for (let y = startTileY; y <= endTileY; y++) {
        const left = x * TILE_SIZE - mapOffset.x + SCREEN_WIDTH / 2;
        const top = y * TILE_SIZE - mapOffset.y + SCREEN_HEIGHT / 2;
        result.push(
          <Image
            key={`${x}-${y}`}
            source={{ uri: getTileUrl(x, y, zoom) }}
            style={[styles.tile, { left, top }]}
          />
        );
      }
    }
    return result;
  }, [location, mapOffset, zoom, getTileUrl]);

  const gymMarkers = useMemo(() => {
    if (!location) return null;
    return gyms.map((gym, i) => {
      const gymX = lonToX(gym.location.longitude);
      const gymY = latToY(gym.location.latitude);
      const left = gymX - mapOffset.x + SCREEN_WIDTH / 2 - 20;
      const top = gymY - mapOffset.y + SCREEN_HEIGHT / 2 - 20;
      const teamColor = gym.team === 'red' ? '#FF5252' : gym.team === 'blue' ? '#2196F3' : gym.team === 'yellow' ? '#FFD700' : '#9E9E9E';
      return (
        <TouchableOpacity key={`gym-${i}`} style={[styles.gymMarker, { left, top, backgroundColor: teamColor }]} onPress={() => setSelectedGym(gym)}>
          <Text style={styles.gymText}>🏛️</Text>
        </TouchableOpacity>
      );
    });
  }, [location, mapOffset, gyms, lonToX, latToY]);

  const pokestopMarkers = useMemo(() => {
    if (!location) return null;
    return pokestops.map((stop, i) => {
      const stopX = lonToX(stop.location.longitude);
      const stopY = latToY(stop.location.latitude);
      const left = stopX - mapOffset.x + SCREEN_WIDTH / 2 - 15;
      const top = stopY - mapOffset.y + SCREEN_HEIGHT / 2 - 15;
      const canVisit = !stop.lastVisited || Date.now() - stop.lastVisited >= 300000;
      return (
        <TouchableOpacity key={`stop-${i}`} style={[styles.pokestopMarker, { left, top, opacity: canVisit ? 1 : 0.5 }]} onPress={() => setSelectedPokestop(stop)}>
          <Text style={styles.pokestopText}>📍</Text>
        </TouchableOpacity>
      );
    });
  }, [location, mapOffset, pokestops, lonToX, latToY]);

  console.log('[MAPSCREEN] RENDER - Pokemon count:', pokemon.length, pokemon.map(p => p.id));
  
  const renderPokemonMarkers = () => {
    console.log('[MAPSCREEN] renderPokemonMarkers - Pokemon:', pokemon.length);
    if (!location) return null;
    
    return pokemon.map((p) => {
      const pokemonX = lonToX(p.location.longitude);
      const pokemonY = latToY(p.location.latitude);
      const left = pokemonX - mapOffset.x + SCREEN_WIDTH / 2 - 25;
      const top = pokemonY - mapOffset.y + SCREEN_HEIGHT / 2 - 25;

      const distance = locationService.calculateDistance(location, p.location);
      const isNearby = distance < 100;
      const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`;
      const key = `${p.id}-${p.location.latitude.toFixed(6)}-${p.location.longitude.toFixed(6)}`;

      console.log('[MAPSCREEN] Rendering Pokemon', p.id, 'at', left, top);

      const spawnKey = `${p.location.latitude.toFixed(6)}-${p.location.longitude.toFixed(6)}`;
      const isNewSpawn = newSpawns.has(spawnKey);
      const spawnAnim = spawnAnimations.current.get(spawnKey);

      return (
        <TouchableOpacity
          key={key}
          style={[styles.pokemonMarker, { left, top }]}
          onPress={() => setSelectedPokemon(p)}
        >
          <Animated.View
            style={[
              styles.pokemonPulse,
              {
                transform: [{ scale: isNearby ? pulseAnim : 1 }],
                backgroundColor: getBiomeColor(p.biome),
              },
            ]}
          />
          {isNewSpawn && spawnAnim && (
            <Animated.View
              style={[
                styles.spawnRing,
                {
                  opacity: spawnAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] }),
                  transform: [{ scale: spawnAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2] }) }],
                },
              ]}
            />
          )}
          <Animated.View style={{ opacity: spawnAnim || 1, transform: [{ scale: spawnAnim?.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) || 1 }] }}>
            <Image source={{ uri: spriteUrl }} style={styles.pokemonSprite} />
          </Animated.View>
        </TouchableOpacity>
      );
    });
  };

  const handleCapture = async () => {
    if (selectedPokemon && location) {
      const distance = locationService.calculateDistance(location, selectedPokemon.location);
      if (distance < 100) {
        try {
          const pokemonData = await pokeApi.getPokemon(selectedPokemon.id);
          pokemonSpawnService.removePokemon(selectedPokemon);
          setSelectedPokemon(null);
          navigation.navigate('ARCapture', { pokemon: pokemonData, biome: selectedPokemon.biome });
        } catch (error) {
          console.error('Failed to fetch pokemon:', error);
        }
      }
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 1, 21));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 1, 18));
  const handleRecenter = () => {
    setFollowMode(true);
    setManualOffset({ x: 0, y: 0 });
  };
  const toggleRotation = () => setMapRotation(prev => prev === 0 ? heading : 0);
  const toggleNearby = () => {
    setNearbyExpanded(!nearbyExpanded);
    Animated.spring(nearbyHeight, {
      toValue: nearbyExpanded ? 60 : 200,
      useNativeDriver: false,
    }).start();
  };

  const lastOffset = useRef({ x: 0, y: 0 });
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5,
      onPanResponderGrant: () => {
        setFollowMode(false);
        lastOffset.current = manualOffset;
      },
      onPanResponderMove: (_, gesture) => {
        const scale = Math.pow(2, zoom);
        setManualOffset({
          x: lastOffset.current.x - gesture.dx / scale,
          y: lastOffset.current.y - gesture.dy / scale,
        });
      },
    })
  ).current;

  const simulateMovement = (direction: string) => {
    if (!location) return;
    const moveAmount = 0.0001;
    let newLoc = { ...location };
    switch(direction) {
      case 'up': newLoc.latitude += moveAmount; break;
      case 'down': newLoc.latitude -= moveAmount; break;
      case 'left': newLoc.longitude -= moveAmount; break;
      case 'right': newLoc.longitude += moveAmount; break;
    }
    if (prevLocation.current) {
      const dx = newLoc.longitude - prevLocation.current.longitude;
      const dy = newLoc.latitude - prevLocation.current.latitude;
      const angle = Math.atan2(dx, dy) * (180 / Math.PI);
      setHeading(angle);
    }
    prevLocation.current = newLoc;
    setLocation(newLoc);
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a2e' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' },
    loadingText: { color: '#fff', fontSize: 18 },
    mapContainer: { flex: 1, overflow: 'hidden' },
    tile: { position: 'absolute', width: TILE_SIZE, height: TILE_SIZE },
    playerMarker: { position: 'absolute', left: SCREEN_WIDTH / 2 - 15, top: SCREEN_HEIGHT / 2 - 15, width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
    playerDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#4169E1', borderWidth: 3, borderColor: '#fff', zIndex: 2, justifyContent: 'center', alignItems: 'center' },
    playerArrow: { width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 4, borderRightWidth: 4, borderBottomWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#fff', transform: [{ translateY: -2 }] },
    playerRing: { position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: '#4169E1', opacity: 0.4 },
    pokemonMarker: { position: 'absolute', width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
    pokemonPulse: { position: 'absolute', width: 50, height: 50, borderRadius: 25 },
    spawnRing: { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#FFD700', top: -15, left: -15 },
    pokemonSprite: { width: 40, height: 40, zIndex: 2 },
    card: { position: 'absolute', bottom: 80, left: 20, right: 20, elevation: 8 },
    nearbyCard: { position: 'absolute', top: 50, left: 15, right: 15, maxHeight: 300, elevation: 8 },
    nearbyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    nearbyItem: { paddingVertical: 8 },
    nearbySprite: { width: 45, height: 45 },
    nearbyInfo: { flex: 1, flexDirection: 'row', gap: 5, alignItems: 'center' },
    nearbyName: { fontSize: 14, fontWeight: '600', marginRight: 10 },
    controlsRight: { position: 'absolute', right: 15, top: SCREEN_HEIGHT / 2 - 100, gap: 10 },
    fab: { marginBottom: 8 },
    fabActive: { backgroundColor: '#4CAF50' },
    moveControls: { position: 'absolute', left: 15, bottom: 120, alignItems: 'center' },
    moveRow: { flexDirection: 'row', gap: 10, marginVertical: 5 },
    moveButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(22, 33, 62, 0.9)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#4169E1' },
    moveText: { color: '#4169E1', fontSize: 24, fontWeight: 'bold' },
    gymMarker: { position: 'absolute', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
    gymText: { fontSize: 20 },
    pokestopMarker: { position: 'absolute', width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
    pokestopText: { fontSize: 24 },
  }), [SCREEN_WIDTH, SCREEN_HEIGHT]);

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.mapContainer} {...panResponder.panHandlers}>
        {tiles}
        {gymMarkers}
        {pokestopMarkers}
        {renderPokemonMarkers()}
        <View style={styles.playerMarker}>
          <Animated.View style={[styles.playerRing, { transform: [{ scale: playerPulse }] }]} />
          <Animated.View style={[styles.playerDot, { transform: [{ rotate: `${heading}deg` }] }]}>
            <View style={styles.playerArrow} />
          </Animated.View>
        </View>
      </View>

      <View style={styles.controlsRight}>
        <FAB icon="crosshairs-gps" size="small" style={styles.fab} onPress={handleRecenter} />
        <FAB icon="plus" size="small" style={styles.fab} onPress={handleZoomIn} />
        <FAB icon="minus" size="small" style={styles.fab} onPress={handleZoomOut} />
        <FAB 
          icon="battery" 
          size="small" 
          style={[styles.fab, batterySaver && styles.fabActive]} 
          onPress={() => setBatterySaver(!batterySaver)} 
        />
        {user && <FAB icon="store" size="small" style={styles.fab} onPress={() => setShopVisible(true)} />}
      </View>

      <View style={styles.moveControls}>
        <TouchableOpacity style={styles.moveButton} onPress={() => simulateMovement('up')}>
          <Text style={styles.moveText}>↑</Text>
        </TouchableOpacity>
        <View style={styles.moveRow}>
          <TouchableOpacity style={styles.moveButton} onPress={() => simulateMovement('left')}>
            <Text style={styles.moveText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.moveButton} onPress={() => simulateMovement('right')}>
            <Text style={styles.moveText}>→</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.moveButton} onPress={() => simulateMovement('down')}>
          <Text style={styles.moveText}>↓</Text>
        </TouchableOpacity>
      </View>

      {selectedGym && (
        <Card style={styles.card}>
          <Card.Title title={selectedGym.name} subtitle={`Team: ${selectedGym.team || 'Unclaimed'} • Level ${selectedGym.level}`} />
          <Card.Actions>
            <IconButton icon="sword" mode="contained" onPress={() => { socialService.claimGym(selectedGym.id, 'blue'); setSelectedGym(null); }} />
            <IconButton icon="close" onPress={() => setSelectedGym(null)} />
          </Card.Actions>
        </Card>
      )}

      {selectedPokestop && (
        <Card style={styles.card}>
          <Card.Title title={selectedPokestop.name} subtitle="Pokéstop" />
          <Card.Actions>
            <IconButton icon="sync" mode="contained" onPress={async () => {
              try {
                const reward = await socialService.visitPokestop(selectedPokestop.id);
                alert(`Received: ${reward.items.join(', ')} +${reward.xp} XP`);
                const updated = await socialService.getPokestops();
                setPokestops(updated);
                setSelectedPokestop(null);
              } catch (e: any) {
                alert(e.message);
              }
            }} />
            <IconButton icon="close" onPress={() => setSelectedPokestop(null)} />
          </Card.Actions>
        </Card>
      )}

      {selectedPokemon && (
        <Card style={styles.card}>
          <Card.Title 
            title={`Pokemon #${selectedPokemon.id}`} 
            subtitle={`${selectedPokemon.biome} • ${Math.round(locationService.calculateDistance(location, selectedPokemon.location))}m away`}
          />
          <Card.Actions>
            <IconButton icon="pokeball" mode="contained" onPress={handleCapture} />
            <IconButton icon="close" onPress={() => setSelectedPokemon(null)} />
          </Card.Actions>
        </Card>
      )}

      <Card style={styles.nearbyCard}>
        <Card.Title 
          title={`Nearby (${pokemon.length})`} 
          right={(props) => <IconButton {...props} icon={nearbyExpanded ? 'chevron-down' : 'chevron-up'} onPress={toggleNearby} />}
        />
        {nearbyExpanded && pokemon.slice(0, 5).map((p, i) => {
          const dist = Math.round(locationService.calculateDistance(location, p.location));
          const key = `${p.location.latitude.toFixed(6)}-${p.location.longitude.toFixed(6)}`;
          const remaining = timeRemaining.get(key) || 0;
          const minutes = Math.floor(remaining / 60);
          const seconds = remaining % 60;
          return (
            <Card.Content key={i} style={styles.nearbyItem}>
              <TouchableOpacity onPress={() => setSelectedPokemon(p)} style={styles.nearbyRow}>
                <Image source={{ uri: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png` }} style={styles.nearbySprite} />
                <View style={styles.nearbyInfo}>
                  <Text style={styles.nearbyName}>#{p.id}</Text>
                  <Chip icon="map-marker-distance" compact>{dist}m</Chip>
                  <Chip icon="timer" compact>{minutes}:{seconds.toString().padStart(2, '0')}</Chip>
                </View>
              </TouchableOpacity>
            </Card.Content>
          );
        })}
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
}

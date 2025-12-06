import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { StyleSheet, View, Image, Animated, TouchableOpacity, Text, Dimensions } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { locationService, PokemonEncounter } from '../services/locationService';
import { pokeApi } from '../services/pokeApi';

const { width, height } = Dimensions.get('window');
const TILE_SIZE = 256;

export default function MapScreen() {
  const navigation = useNavigation();
  const [location, setLocation] = useState<any>(null);
  const [pokemon, setPokemon] = useState<PokemonEncounter[]>([]);
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonEncounter | null>(null);
  const [zoom, setZoom] = useState(16);
  const [heading, setHeading] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const playerPulse = useRef(new Animated.Value(1)).current;
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

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      
      locationService.requestLocationPermission().then(granted => {
        if (granted && mounted) {
          locationService.getCurrentLocation().then(loc => {
            if (mounted) {
              setLocation(loc);
              const encounters = locationService.generatePokemonEncounters(loc);
              setPokemon(encounters);
            }
          }).catch(() => {
            if (mounted) {
              const defaultLoc = { latitude: 37.7749, longitude: -122.4194 };
              setLocation(defaultLoc);
              setPokemon(locationService.generatePokemonEncounters(defaultLoc));
            }
          });

          locationService.watchLocation(loc => {
            if (mounted) {
              if (prevLocation.current) {
                const dx = loc.longitude - prevLocation.current.longitude;
                const dy = loc.latitude - prevLocation.current.latitude;
                const angle = Math.atan2(dx, dy) * (180 / Math.PI);
                setHeading(angle);
              }
              prevLocation.current = loc;
              setLocation(loc);
            }
          }).then(watcher => {
            watcherRef.current = watcher;
          });
        }
      });

      return () => {
        mounted = false;
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
      tileCache.current.set(key, `https://tiles.stadiamaps.com/tiles/osm_bright/${z}/${x}/${y}.png?api_key=c85391af-3b16-4bac-82ab-de934ffc3543`);
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

  const tiles = useMemo(() => {
    if (!location) return [];

    const centerX = lonToX(location.longitude);
    const centerY = latToY(location.latitude);

    const startTileX = Math.floor((centerX - width / 2) / TILE_SIZE);
    const startTileY = Math.floor((centerY - height / 2) / TILE_SIZE);
    const endTileX = Math.ceil((centerX + width / 2) / TILE_SIZE);
    const endTileY = Math.ceil((centerY + height / 2) / TILE_SIZE);

    const result = [];
    for (let x = startTileX; x <= endTileX; x++) {
      for (let y = startTileY; y <= endTileY; y++) {
        const left = x * TILE_SIZE - centerX + width / 2;
        const top = y * TILE_SIZE - centerY + height / 2;
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
  }, [location, zoom, lonToX, latToY, getTileUrl]);

  const pokemonMarkers = useMemo(() => {
    if (!location) return null;

    const centerX = lonToX(location.longitude);
    const centerY = latToY(location.latitude);

    return pokemon.map((p, i) => {
      const pokemonX = lonToX(p.location.longitude);
      const pokemonY = latToY(p.location.latitude);
      const left = pokemonX - centerX + width / 2 - 25;
      const top = pokemonY - centerY + height / 2 - 25;

      const distance = locationService.calculateDistance(location, p.location);
      const isNearby = distance < 50;
      const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`;

      return (
        <TouchableOpacity
          key={i}
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
          <Image source={{ uri: spriteUrl }} style={styles.pokemonSprite} />
        </TouchableOpacity>
      );
    });
  }, [location, pokemon, lonToX, latToY, pulseAnim, getBiomeColor]);

  const handleCapture = async () => {
    if (selectedPokemon && location) {
      const distance = locationService.calculateDistance(location, selectedPokemon.location);
      if (distance < 50) {
        try {
          const pokemonData = await pokeApi.getPokemon(selectedPokemon.id);
          navigation.navigate('ARCapture' as never, { pokemon: pokemonData, biome: selectedPokemon.biome } as never);
          setPokemon(prev => prev.filter(p => p.id !== selectedPokemon.id));
          setSelectedPokemon(null);
        } catch (error) {
          console.error('Failed to fetch pokemon:', error);
        }
      }
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 1, 18));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 1, 14));

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        {tiles}
        {pokemonMarkers}
        <View style={styles.playerMarker}>
          <Animated.View style={[styles.playerRing, { transform: [{ scale: playerPulse }] }]} />
          <Animated.View style={[styles.playerDot, { transform: [{ rotate: `${heading}deg` }] }]}>
            <View style={styles.playerArrow} />
          </Animated.View>
        </View>
      </View>

      <View style={styles.zoomControls}>
        <TouchableOpacity style={styles.zoomButton} onPress={handleZoomIn}>
          <Text style={styles.zoomText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomButton} onPress={handleZoomOut}>
          <Text style={styles.zoomText}>−</Text>
        </TouchableOpacity>
      </View>

      {selectedPokemon && (
        <View style={styles.pokemonCard}>
          <Text style={styles.cardTitle}>Pokemon #{selectedPokemon.id}</Text>
          <Text style={styles.cardBiome}>Biome: {selectedPokemon.biome}</Text>
          <Text style={styles.cardDistance}>
            Distance: {Math.round(locationService.calculateDistance(location, selectedPokemon.location))}m
          </Text>
          <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
            <Text style={styles.captureText}>Capture</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedPokemon(null)}
          >
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.statsBar}>
        <Text style={styles.statsText}>🎯 Pokemon Nearby: {pokemon.length}</Text>
        <Text style={styles.statsText}>📍 {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</Text>
        <Text style={styles.statsText}>🧭 Heading: {Math.round(heading)}°</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  tile: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  playerMarker: {
    position: 'absolute',
    left: width / 2 - 15,
    top: height / 2 - 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4169E1',
    borderWidth: 3,
    borderColor: '#fff',
    zIndex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#fff',
    transform: [{ translateY: -2 }],
  },
  playerRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#4169E1',
    opacity: 0.4,
  },
  pokemonMarker: {
    position: 'absolute',
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pokemonPulse: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  pokemonSprite: {
    width: 40,
    height: 40,
    zIndex: 2,
  },
  pokemonCard: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: '#16213e',
    borderRadius: 15,
    padding: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  cardTitle: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cardBiome: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 5,
  },
  cardDistance: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 15,
  },
  captureButton: {
    backgroundColor: '#FFD700',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  captureText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#555',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 14,
  },
  statsBar: {
    position: 'absolute',
    top: 40,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(22, 33, 62, 0.9)',
    padding: 10,
    borderRadius: 10,
  },
  statsText: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 2,
  },
  zoomControls: {
    position: 'absolute',
    right: 15,
    bottom: 120,
    gap: 10,
  },
  zoomButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(22, 33, 62, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  zoomText: {
    color: '#FFD700',
    fontSize: 28,
    fontWeight: 'bold',
  },
});

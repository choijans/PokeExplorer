import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { Pokemon } from '../services/pokeApi';
import { discoveryService } from '../services/discoveryService';

const { width, height } = Dimensions.get('window');

const ARCaptureScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { pokemon, biome } = route.params as { pokemon: Pokemon; biome: string };
  
  const [catching, setCatching] = useState(false);
  const [caught, setCaught] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const device = useCameraDevice('back');
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        const status = await Camera.requestCameraPermission();
        setHasPermission(status === 'granted');
      }
    })();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -20,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleCatch = async () => {
    setCatching(true);
    
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();

    setTimeout(async () => {
      const success = Math.random() > 0.3;
      if (success) {
        await discoveryService.addDiscoveredPokemon(pokemon, undefined, biome);
        setCaught(true);
        setTimeout(() => navigation.goBack(), 2000);
      } else {
        setCatching(false);
        setTimeout(() => navigation.goBack(), 1500);
      }
    }, 1500);
  };

  const imageUrl = pokemon.sprites.other?.['official-artwork']?.front_default || pokemon.sprites.front_default;
  const biomeConfig = getBiomeConfig(biome);

  if (!hasPermission || !device) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
      />
      <View style={[styles.biomeFilter, { backgroundColor: biomeConfig.filterColor }]} />
        <View style={[styles.biomeOverlay, { backgroundColor: biomeConfig.overlayColor }]}>
          <Text style={styles.biomeText}>{biomeConfig.icon} {biome.toUpperCase()} BIOME</Text>
        </View>

  {biomeConfig.particles.map((particle: BiomeParticle, i: number) => (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                left: particle.x,
                top: particle.y,
                opacity: floatAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.3, 0.8, 0.3],
                }),
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -30],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.particleText}>{particle.emoji}</Text>
          </Animated.View>
        ))}

        <Animated.View
          style={[
            styles.pokemonContainer,
            { transform: [{ translateY: bounceAnim }, { translateX: shakeAnim }] },
          ]}
        >
          <Image source={{ uri: imageUrl }} style={styles.pokemonImage} resizeMode="contain" />
        </Animated.View>

        <View style={styles.infoPanel}>
          <Text style={styles.pokemonName}>{pokemon.name.toUpperCase()}</Text>
          <Text style={styles.pokemonType}>
            {pokemon.types.map(t => t.type.name).join(' • ')}
          </Text>
        </View>

        {!catching && !caught && (
          <TouchableOpacity style={styles.catchButton} onPress={handleCatch}>
            <Text style={styles.catchButtonText}>🎯 THROW POKÉBALL</Text>
          </TouchableOpacity>
        )}

        {catching && !caught && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>⚡ Catching...</Text>
          </View>
        )}

        {caught && (
          <View style={styles.statusContainer}>
            <Text style={styles.successText}>✨ GOTCHA! ✨</Text>
            <Text style={styles.successSubtext}>{pokemon.name} was caught!</Text>
          </View>
        )}

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
    </View>
  );
};

type BiomeParticle = {
  x: number;
  y: number;
  emoji: string;
};

type BiomeConfig = {
  filterColor: string;
  overlayColor: string;
  icon: string;
  particles: BiomeParticle[];
};

const createParticles = (count: number, emojiSet: string[]): BiomeParticle[] =>
  Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height * 0.6,
    emoji: emojiSet[Math.floor(Math.random() * emojiSet.length)],
  }));

const getBiomeConfig = (biome: string): BiomeConfig => {
  const configs: Record<string, BiomeConfig> = {
    water: {
      filterColor: 'rgba(30, 144, 255, 0.15)',
      overlayColor: 'rgba(30, 144, 255, 0.8)',
      icon: '💧',
      particles: createParticles(8, ['💧', '🌊', '💦']),
    },
    grass: {
      filterColor: 'rgba(34, 139, 34, 0.15)',
      overlayColor: 'rgba(34, 139, 34, 0.8)',
      icon: '🌿',
      particles: createParticles(10, ['🌿', '🍃', '🌱']),
    },
    urban: {
      filterColor: 'rgba(105, 105, 105, 0.15)',
      overlayColor: 'rgba(105, 105, 105, 0.8)',
      icon: '🏙️',
      particles: createParticles(6, ['⚡', '🌃', '🏢']),
    },
    normal: {
      filterColor: 'rgba(255, 215, 0, 0.1)',
      overlayColor: 'rgba(255, 215, 0, 0.8)',
      icon: '☀️',
      particles: createParticles(8, ['✨', '⭐', '🌟']),
    },
  };
  return configs[biome] || configs.normal;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingText: { color: '#fff', fontSize: 18, textAlign: 'center', marginTop: 100 },
  biomeFilter: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  biomeOverlay: { position: 'absolute', top: 60, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, zIndex: 10 },
  biomeText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  particle: { position: 'absolute', zIndex: 1 },
  particleText: { fontSize: 24 },
  pokemonContainer: { width: width * 0.7, height: width * 0.7, justifyContent: 'center', alignItems: 'center', zIndex: 5 },
  pokemonImage: { width: '100%', height: '100%' },
  infoPanel: { position: 'absolute', top: 120, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 25, alignItems: 'center', zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  pokemonName: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  pokemonType: { fontSize: 16, color: '#666', marginTop: 5, textTransform: 'uppercase' },
  catchButton: { position: 'absolute', bottom: 100, backgroundColor: '#FF0000', paddingHorizontal: 40, paddingVertical: 20, borderRadius: 50, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8, zIndex: 10 },
  catchButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  statusContainer: { position: 'absolute', bottom: 100, alignItems: 'center', zIndex: 10 },
  statusText: { fontSize: 24, fontWeight: 'bold', color: '#FFD700', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  successText: { fontSize: 32, fontWeight: 'bold', color: '#FFD700', textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 5 },
  successSubtext: { fontSize: 18, color: '#fff', marginTop: 10, textTransform: 'capitalize', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  backButton: { position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, zIndex: 10 },
  backButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default ARCaptureScreen;
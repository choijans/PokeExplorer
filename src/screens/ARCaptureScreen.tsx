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
import { Button, Chip, Surface, IconButton } from 'react-native-paper';
import { Pokemon } from '../services/pokeApi';
import { discoveryService } from '../services/discoveryService';

const { width, height } = Dimensions.get('window');

const ARCaptureScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { pokemon, biome } = route.params as { pokemon: Pokemon; biome: string };
  
  const [catching, setCatching] = useState(false);
  const [caught, setCaught] = useState(false);
  const [escaped, setEscaped] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [throwY, setThrowY] = useState(0);
  const [difficulty, setDifficulty] = useState(0.5);
  const [circleSize, setCircleSize] = useState(1);
  const [berryActive, setBerryActive] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [candyGained, setCandyGained] = useState(0);
  const device = useCameraDevice('back');
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const circleAnim = useRef(new Animated.Value(1)).current;
  const throwAnim = useRef(new Animated.Value(0)).current;

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

    Animated.loop(
      Animated.sequence([
        Animated.timing(circleAnim, {
          toValue: 0.5,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(circleAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const useBerry = () => {
    setBerryActive(true);
    setDifficulty(prev => Math.max(0.2, prev - 0.3));
    setTimeout(() => setBerryActive(false), 5000);
  };

  const handleThrow = (gestureY: number) => {
    setThrowY(gestureY);
    setCatching(true);

    Animated.timing(throwAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
    
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();

    setTimeout(async () => {
      const currentCircleSize = circleAnim._value;
      const throwAccuracy = 1 - Math.abs(currentCircleSize - 0.7);
      const baseRate = 0.5;
      const difficultyMod = 1 - difficulty;
      const berryMod = berryActive ? 0.3 : 0;
      const accuracyMod = throwAccuracy * 0.2;
      const catchRate = Math.min(0.95, baseRate + difficultyMod + berryMod + accuracyMod);
      
      const success = Math.random() < catchRate;
      
      if (success) {
        const xp = Math.floor(100 + throwAccuracy * 50 + (berryActive ? 25 : 0));
        const candy = Math.floor(Math.random() * 3) + 3;
        setXpGained(xp);
        setCandyGained(candy);
        await discoveryService.addDiscoveredPokemon(pokemon, undefined, biome);
        setCaught(true);
        setTimeout(() => navigation.goBack(), 3000);
      } else {
        const escapeChance = Math.random();
        if (escapeChance < 0.3) {
          setEscaped(true);
          setTimeout(() => navigation.goBack(), 2000);
        } else {
          setCatching(false);
          throwAnim.setValue(0);
        }
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

        {biomeConfig.particles.map((particle, i) => (
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

        <Animated.View
          style={[
            styles.difficultyCircle,
            {
              transform: [{ scale: circleAnim }],
              borderColor: circleAnim.interpolate({
                inputRange: [0.5, 0.7, 1],
                outputRange: ['#4CAF50', '#FFD700', '#FF5252'],
              }),
            },
          ]}
        />

        {!catching && !caught && !escaped && (
          <View style={styles.controlsContainer}>
            <Button mode="contained" icon="fruit-cherries" onPress={useBerry} disabled={berryActive} style={styles.berryButton}>
              Berry
            </Button>
            <Button mode="contained" icon="pokeball" onPress={() => handleThrow(0)} style={styles.throwButton}>
              THROW
            </Button>
          </View>
        )}

        {catching && !caught && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>⚡ Catching...</Text>
          </View>
        )}

        {caught && (
          <Surface style={styles.statusSurface} elevation={4}>
            <Text style={styles.successText}>✨ GOTCHA! ✨</Text>
            <Text style={styles.successSubtext}>{pokemon.name} was caught!</Text>
            <Chip icon="star">+{xpGained} XP</Chip>
            <Chip icon="candy">+{candyGained} Candy</Chip>
          </Surface>
        )}

        {escaped && (
          <Surface style={styles.statusSurface} elevation={4}>
            <Text style={styles.escapeText}>💨 {pokemon.name} fled!</Text>
          </Surface>
        )}

        <IconButton icon="arrow-left" mode="contained" onPress={() => navigation.goBack()} style={styles.backButton} />
    </View>
  );
};

const getBiomeConfig = (biome: string) => {
  const configs: any = {
    water: {
      filterColor: 'rgba(30, 144, 255, 0.15)',
      overlayColor: 'rgba(30, 144, 255, 0.8)',
      icon: '💧',
      particles: Array.from({ length: 8 }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height * 0.6,
        emoji: ['💧', '🌊', '💦'][Math.floor(Math.random() * 3)],
      })),
    },
    grass: {
      filterColor: 'rgba(34, 139, 34, 0.15)',
      overlayColor: 'rgba(34, 139, 34, 0.8)',
      icon: '🌿',
      particles: Array.from({ length: 10 }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height * 0.6,
        emoji: ['🌿', '🍃', '🌱'][Math.floor(Math.random() * 3)],
      })),
    },
    urban: {
      filterColor: 'rgba(105, 105, 105, 0.15)',
      overlayColor: 'rgba(105, 105, 105, 0.8)',
      icon: '🏙️',
      particles: Array.from({ length: 6 }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height * 0.6,
        emoji: ['⚡', '🌃', '🏢'][Math.floor(Math.random() * 3)],
      })),
    },
    normal: {
      filterColor: 'rgba(255, 215, 0, 0.1)',
      overlayColor: 'rgba(255, 215, 0, 0.8)',
      icon: '☀️',
      particles: Array.from({ length: 8 }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height * 0.6,
        emoji: ['✨', '⭐', '🌟'][Math.floor(Math.random() * 3)],
      })),
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
  controlsContainer: { position: 'absolute', bottom: 100, flexDirection: 'row', gap: 15, zIndex: 10 },
  berryButton: { backgroundColor: '#9C27B0' },
  throwButton: { backgroundColor: '#FF0000' },
  difficultyCircle: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 5, zIndex: 4 },
  rewardText: { fontSize: 16, color: '#FFD700', marginTop: 5, fontWeight: 'bold', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  escapeText: { fontSize: 28, fontWeight: 'bold', color: '#FF5252', textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 5 },
  statusSurface: { position: 'absolute', bottom: 100, padding: 20, borderRadius: 15, alignItems: 'center', zIndex: 10, gap: 10 },
  statusText: { fontSize: 24, fontWeight: 'bold', color: '#FFD700', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  successText: { fontSize: 32, fontWeight: 'bold', color: '#FFD700', textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 5 },
  successSubtext: { fontSize: 18, color: '#fff', marginTop: 10, textTransform: 'capitalize', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  backButton: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
});

export default ARCaptureScreen;
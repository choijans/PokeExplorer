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
  PanResponder,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { Button, Chip, Surface, IconButton } from 'react-native-paper';
import { Pokemon } from '../services/pokeApi';
import { discoveryService } from '../services/discoveryService';
import { inventoryService, InventoryItem } from '../services/inventoryService';
import { firebaseDiscoveryService } from '../services/firebaseDiscoveryService';
import { firebaseInventoryService } from '../services/firebaseInventoryService';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

const ARCaptureScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { pokemon, biome } = route.params as { pokemon: Pokemon; biome: string };
  const { user } = useAuth();
  
  const [catching, setCatching] = useState(false);
  const [caught, setCaught] = useState(false);
  const [escaped, setEscaped] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [difficulty, setDifficulty] = useState(0.5);
  const [berryActive, setBerryActive] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [candyGained, setCandyGained] = useState(0);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedBall, setSelectedBall] = useState('pokeball');
  const [selectedBerry, setSelectedBerry] = useState<string | null>(null);
  const [isThrowing, setIsThrowing] = useState(false);
  const [throwPower, setThrowPower] = useState(0);
  const device = useCameraDevice('back');
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const circleAnim = useRef(new Animated.Value(1)).current;
  const throwAnim = useRef(new Animated.Value(0)).current;
  const ballAnim = useRef(new Animated.Value(height * 0.85)).current;
  const ballRotate = useRef(new Animated.Value(0)).current;
  const ballScale = useRef(new Animated.Value(1)).current;
  const ballX = useRef(new Animated.Value(0)).current;
  const ballY = useRef(new Animated.Value(0)).current;
  const [trajectoryPoints, setTrajectoryPoints] = useState<{x: number, y: number}[]>([]);

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        const status = await Camera.requestCameraPermission();
        setHasPermission(status === 'granted');
      }
      const inv = user ? await firebaseInventoryService.getInventory(user.uid) : await inventoryService.getInventory();
      setInventory(inv);
      ballAnim.setValue(0);
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

  const useBerry = async (berryType: string) => {
    const success = user ? await firebaseInventoryService.useItem(user.uid, berryType) : await inventoryService.useItem(berryType);
    if (!success) return;
    
    setSelectedBerry(berryType);
    setBerryActive(true);
    const inv = user ? await firebaseInventoryService.getInventory(user.uid) : await inventoryService.getInventory();
    setInventory(inv);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !catching && !caught && !escaped,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5 || Math.abs(gesture.dx) > 5,
      onPanResponderGrant: () => {
        setIsThrowing(true);
        ballX.setValue(0);
        ballY.setValue(0);
        setTrajectoryPoints([]);
      },
      onPanResponderMove: (_, gesture) => {
        const points = [];
        const steps = 15;
        const velocityX = gesture.vx * 0.3;
        const velocityY = gesture.vy * 0.5;
        
        for (let i = 0; i < steps; i++) {
          const t = i / steps;
          const x = gesture.dx + velocityX * t * 200;
          const y = gesture.dy + velocityY * t * 200 + (0.5 * 9.8 * t * t * 300);
          points.push({ x, y });
        }
        setTrajectoryPoints(points);
        
        ballX.setValue(gesture.dx);
        ballY.setValue(gesture.dy);
      },
      onPanResponderRelease: async (_, gesture) => {
        setIsThrowing(false);
        setTrajectoryPoints([]);
        
        const throwDistance = Math.sqrt(gesture.dx ** 2 + gesture.dy ** 2);
        const throwVelocity = Math.sqrt(gesture.vx ** 2 + gesture.vy ** 2);
        
        if (throwDistance > 50 && gesture.dy < -50) {
          const canUse = user ? await firebaseInventoryService.useItem(user.uid, selectedBall) : await inventoryService.useItem(selectedBall);
          if (!canUse) {
            alert('No Poké Balls left!');
            ballX.setValue(0);
            ballY.setValue(0);
            return;
          }
          
          const inv = user ? await firebaseInventoryService.getInventory(user.uid) : await inventoryService.getInventory();
          setInventory(inv);
          
          handleThrow(throwVelocity, gesture.dx, gesture.dy, gesture.vx, gesture.vy);
        } else {
          Animated.parallel([
            Animated.spring(ballX, { toValue: 0, useNativeDriver: true }),
            Animated.spring(ballY, { toValue: 0, useNativeDriver: true }),
          ]).start();
        }
      },
    })
  ).current;

  const handleThrow = (velocity: number, dx: number, dy: number, vx: number, vy: number) => {
    setCatching(true);

    const targetX = width / 2 - 35;
    const targetY = height * 0.35;
    const duration = Math.max(400, Math.min(800, 1000 / velocity));

    Animated.parallel([
      Animated.timing(ballX, {
        toValue: dx + vx * 100,
        duration: duration,
        useNativeDriver: true,
      }),
      Animated.timing(ballY, {
        toValue: -height * 0.6,
        duration: duration,
        useNativeDriver: true,
      }),
      Animated.timing(ballRotate, {
        toValue: velocity > 2 ? 3 : 2,
        duration: duration,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(ballScale, {
          toValue: 0.6,
          duration: duration * 0.7,
          useNativeDriver: true,
        }),
        Animated.timing(ballScale, {
          toValue: 1.2,
          duration: duration * 0.3,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      Animated.parallel([
        Animated.spring(ballX, { toValue: 0, useNativeDriver: true }),
        Animated.spring(ballY, { toValue: 0, useNativeDriver: true }),
        Animated.timing(ballScale, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        ballRotate.setValue(0);
      });
    });
    
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();

    setTimeout(async () => {
      const currentCircleSize = circleAnim._value;
      const throwAccuracy = 1 - Math.abs(currentCircleSize - 0.65);
      const centerAccuracy = 1 - Math.abs(dx) / (width / 2);
      const ballBonus = firebaseInventoryService.getCatchRateBonus(selectedBall);
      const berryEffect = selectedBerry ? firebaseInventoryService.getBerryEffect(selectedBerry) : { catchBonus: 0, fleeReduction: 0 };
      const baseRate = 0.3;
      const difficultyMod = 1 - difficulty;
      const accuracyMod = throwAccuracy * 0.25;
      const aimMod = centerAccuracy * 0.15;
      const speedMod = Math.min(velocity * 0.1, 0.2);
      const catchRate = Math.min(0.95, (baseRate + difficultyMod + accuracyMod + aimMod + speedMod + berryEffect.catchBonus) * ballBonus);
      
      const success = Math.random() < catchRate;
      
      if (success) {
        const xp = Math.floor(100 + throwAccuracy * 50 + centerAccuracy * 30 + (berryActive ? 25 : 0));
        const candy = Math.floor(Math.random() * 3) + 3;
        setXpGained(xp);
        setCandyGained(candy);
        await discoveryService.addDiscoveredPokemon(pokemon, undefined, biome);
        if (user) {
          await firebaseDiscoveryService.addCapturedPokemon(user.uid, pokemon, undefined, biome);
        }
        setCaught(true);
        setTimeout(() => navigation.goBack(), 3000);
      } else {
        const escapeChance = Math.random();
        if (escapeChance < 0.3 - berryEffect.fleeReduction) {
          setEscaped(true);
          setTimeout(() => navigation.goBack(), 2000);
        } else {
          setCatching(false);
          ballX.setValue(0);
          ballY.setValue(0);
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
          <>
            <View style={styles.inventoryContainer}>
              <View style={styles.itemsRow}>
                {inventory.filter(i => i.type.includes('ball')).map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.itemButton, selectedBall === item.id && styles.itemSelected]}
                    onPress={() => setSelectedBall(item.id)}
                  >
                    <Text style={styles.itemIcon}>{item.icon}</Text>
                    <Text style={styles.itemCount}>{item.count}</Text>
                  </TouchableOpacity>
                ))}
                {inventory.filter(i => i.type.includes('razz') || i.type.includes('nanab')).map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.itemButton, selectedBerry === item.id && styles.itemSelected]}
                    onPress={() => useBerry(item.id)}
                    disabled={berryActive || item.count === 0}
                  >
                    <Text style={styles.itemIcon}>{item.icon}</Text>
                    <Text style={styles.itemCount}>{item.count}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View {...panResponder.panHandlers} style={styles.throwArea}>
              {isThrowing && trajectoryPoints.map((point, i) => (
                <View
                  key={i}
                  style={[
                    styles.trajectoryDot,
                    {
                      left: width / 2 + point.x - 3,
                      bottom: 140 - point.y,
                      opacity: 1 - (i / trajectoryPoints.length) * 0.7,
                    },
                  ]}
                />
              ))}
              <Animated.Image
                source={{ uri: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png' }}
                style={[styles.throwingBall, { 
                  transform: [
                    { translateX: ballX },
                    { translateY: ballY },
                    { rotate: ballRotate.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    })},
                    { scale: ballScale },
                  ]
                }]}
              />
              {!isThrowing && (
                <Text style={styles.throwHint}>👆 Swipe to Throw</Text>
              )}
            </View>
          </>
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
  biomeOverlay: { position: 'absolute', top: 60, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, zIndex: 10 },
  biomeText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  particle: { position: 'absolute', zIndex: 1 },
  particleText: { fontSize: 24 },
  pokemonContainer: { position: 'absolute', top: height * 0.25, alignSelf: 'center', width: width * 0.6, height: width * 0.6, justifyContent: 'center', alignItems: 'center', zIndex: 5 },
  pokemonImage: { width: '100%', height: '100%' },
  infoPanel: { position: 'absolute', top: 120, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 25, alignItems: 'center', zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  pokemonName: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  pokemonType: { fontSize: 16, color: '#666', marginTop: 5, textTransform: 'uppercase' },
  inventoryContainer: { position: 'absolute', bottom: 20, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, zIndex: 10 },
  itemsRow: { flexDirection: 'row', gap: 12 },
  itemButton: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 8, borderRadius: 12, alignItems: 'center', minWidth: 55 },
  itemSelected: { backgroundColor: 'rgba(255,215,0,0.6)', borderWidth: 3, borderColor: '#FFD700' },
  itemIcon: { fontSize: 28 },
  itemCount: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginTop: 3 },
  throwArea: { position: 'absolute', bottom: 120, alignSelf: 'center', width: width, height: 150, alignItems: 'center', justifyContent: 'flex-start', zIndex: 15 },
  throwingBall: { width: 70, height: 70, marginTop: 20 },
  throwHint: { color: '#FFD700', fontSize: 14, fontWeight: 'bold', marginTop: 10, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  trajectoryDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFD700', zIndex: 14 },
  difficultyCircle: { position: 'absolute', top: height * 0.4, alignSelf: 'center', width: 180, height: 180, borderRadius: 90, borderWidth: 4, zIndex: 4 },
  rewardText: { fontSize: 16, color: '#FFD700', marginTop: 5, fontWeight: 'bold', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  escapeText: { fontSize: 28, fontWeight: 'bold', color: '#FF5252', textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 5 },
  statusSurface: { position: 'absolute', bottom: 100, alignSelf: 'center', padding: 20, borderRadius: 15, alignItems: 'center', zIndex: 10, gap: 10 },
  statusText: { fontSize: 24, fontWeight: 'bold', color: '#FFD700', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  successText: { fontSize: 32, fontWeight: 'bold', color: '#FFD700', textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 5 },
  successSubtext: { fontSize: 18, color: '#fff', marginTop: 10, textTransform: 'capitalize', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  backButton: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
});

export default ARCaptureScreen;
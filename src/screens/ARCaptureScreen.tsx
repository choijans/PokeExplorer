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
  ImageBackground,
  Vibration,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { IconButton } from 'react-native-paper';
import { Pokemon } from '../services/pokeApi';
import { discoveryService } from '../services/discoveryService';
import { inventoryService, InventoryItem } from '../services/inventoryService';
import { firebaseDiscoveryService } from '../services/firebaseDiscoveryService';
import { firebaseInventoryService } from '../services/firebaseInventoryService';
import { pokemonInstanceService } from '../services/pokemonInstanceService';
import { levelService } from '../services/levelService';
import { catchHistoryService } from '../services/catchHistoryService';
import { firebaseCatchHistoryService } from '../services/firebaseCatchHistoryService';
import { offlineCacheService } from '../services/offlineCacheService';
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
  const [berryActive, setBerryActive] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [candyGained, setCandyGained] = useState(0);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedBall, setSelectedBall] = useState('pokeball');
  const [selectedBerry, setSelectedBerry] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'capture' | 'items'>('capture');
  const [showMinigame, setShowMinigame] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [announceText, setAnnounceText] = useState('');
  const [showThrowButton, setShowThrowButton] = useState(true);
  const [rarity, setRarity] = useState<'common'|'uncommon'|'rare'|'epic'|'legendary'>('common');
  const [minigameReady, setMinigameReady] = useState(false);
  const [catchQuality, setCatchQuality] = useState<'Nice'|'Great'|'Excellent'|null>(null);
  const [showCaptureResult, setShowCaptureResult] = useState<'catching' | 'success' | 'escape' | null>(null);
  const isHoldingRef = useRef(false);
  const tensionSamplesRef = useRef<number[]>([]);
  const timeInZoneRef = useRef(0);
  const totalTimeRef = useRef(0);
  const captureZonePosRef = useRef(50);
  const captureZoneVelocityRef = useRef(0);
  const pokemonPosRef = useRef(50);
  const pokemonVelocityRef = useRef(0);
  const pokemonTargetRef = useRef(50);
  const progressRef = useRef(0);
  const intervalRef = useRef<any>(null);
  
  const device = useCameraDevice('back');
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const circleAnim = useRef(new Animated.Value(1)).current;
  const breatheAnim = useRef(new Animated.Value(0)).current;
  const captureZoneAnim = useRef(new Animated.Value(50)).current;
  const pokemonAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const throwButtonGlow = useRef(new Animated.Value(0)).current;
  const dimAnim = useRef(new Animated.Value(0)).current;
  const pokeballShakeAnim = useRef(new Animated.Value(0)).current;
  const pokeballScaleAnim = useRef(new Animated.Value(1)).current;
  const pokemonEscapeAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const pokeballShakeLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        const status = await Camera.requestCameraPermission();
        setHasPermission(status === 'granted');
      }
      setRarity(calculateRarity(pokemon));
    })();

    Animated.loop(Animated.sequence([
      Animated.timing(bounceAnim, { toValue: -20, duration: 1500, useNativeDriver: true }),
      Animated.timing(bounceAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
    ])).start();

    Animated.loop(Animated.sequence([
      Animated.timing(breatheAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      Animated.timing(breatheAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
    ])).start();

    Animated.loop(Animated.sequence([
      Animated.timing(circleAnim, { toValue: 0.5, duration: 1500, useNativeDriver: true }),
      Animated.timing(circleAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
    ])).start();

    Animated.loop(Animated.sequence([
      Animated.timing(throwButtonGlow, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(throwButtonGlow, { toValue: 0, duration: 1000, useNativeDriver: true }),
    ])).start();
  }, []);

  useEffect(() => {
    if (user) {
      const unsubscribe = firebaseInventoryService.subscribeToInventory(user.uid, setInventory);
      return unsubscribe;
    } else {
      inventoryService.getInventory().then(setInventory);
    }
  }, [user]);

  const useBerry = async (berryType: string) => {
    const success = user ? await firebaseInventoryService.useItem(user.uid, berryType) : await inventoryService.useItem(berryType);
    if (!success) return;
    
    setSelectedBerry(berryType);
    setBerryActive(true);
    const berryName = inventory.find(i => i.id === berryType)?.name || 'Berry';
    const berryEffects: Record<string, string> = {
      razz: 'easier to catch',
      nanab: 'calmer',
      pinap: 'more candy',
      goldenrazz: 'much easier to catch',
      silverpinap: 'easier + more candy',
    };
    setAnnounceText(`You used a ${berryName}!\nThe wild Pokémon is ${berryEffects[berryType] || 'affected'}.`);
    
    // Clear the announcement after 2.5 seconds
    setTimeout(() => {
      setAnnounceText('');
    }, 2500);
  };

  const handleThrow = async () => {
    console.log('handleThrow called, selectedBall:', selectedBall, 'inventory:', inventory);
    
    if (inventory.length === 0) {
      Alert.alert('Loading', 'Inventory is still loading. Please wait...');
      return;
    }
    
    const ballItem = inventory.find(i => i.id === selectedBall);
    if (!ballItem || ballItem.count <= 0) {
      Alert.alert('No Poké Balls', 'You don\'t have any Poké Balls left!');
      return;
    }
    
    const canUse = user ? await firebaseInventoryService.useItem(user.uid, selectedBall) : await inventoryService.useItem(selectedBall);
    if (!canUse) { 
      Alert.alert('Error', 'Failed to use Poké Ball. Please try again.'); 
      return; 
    }
    
    Vibration.vibrate(50);
    setAnnounceText(`You threw a ${ballItem.name}!`);
    setCatching(true);
    setShowThrowButton(false);
    
    // Directly trigger the minigame after a delay instead of relying on animation callbacks
    setTimeout(() => {
      console.log('Timeout fired, starting ball shake sequence');
      startBallShake();
    }, 800);
  };

  const startBallShake = () => {
    console.log('startBallShake called');
    setAnnounceText('The wild Pokémon is watching carefully...\nGet ready!');
    
    // Start dim animation
    Animated.timing(dimAnim, { toValue: 0.6, duration: 300, useNativeDriver: false }).start();
    
    // Start shake animation
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 150, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 150, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();
    
    // Use setTimeout to guarantee the minigame starts, regardless of animation callback issues
    setTimeout(() => {
      console.log('Starting minigame after shake delay');
      setShowMinigame(true);
      startMinigame();
    }, 500);
  };

  const startMinigame = () => {
    console.log('startMinigame called');
    const config = getBallConfig(selectedBall);
    captureZonePosRef.current = 50;
    captureZoneVelocityRef.current = 0;
    pokemonPosRef.current = 50;
    pokemonVelocityRef.current = 0;
    pokemonTargetRef.current = 50;
    progressRef.current = 20;
    captureZoneAnim.setValue(50);
    pokemonAnim.setValue(50);
    setCaptureProgress(20);
    progressAnim.setValue(20);
    setMinigameReady(false);
    setAnnounceText('GET READY...');
    tensionSamplesRef.current = [];
    timeInZoneRef.current = 0;
    totalTimeRef.current = 0;
    
    // Reset pokeball animation values
    pokeballShakeAnim.setValue(0);
    pokeballScaleAnim.setValue(1);
    pokemonEscapeAnim.setValue(0);
    sparkleAnim.setValue(0);
    
    // Start pokeball shake animation
    setShowCaptureResult('catching');
    startPokeballShake();
    
    setTimeout(() => {
      console.log('Minigame ready, starting game loop');
      setMinigameReady(true);
      setAnnounceText('');
      startGameLoop();
    }, 1000);
  };

  const startPokeballShake = () => {
    pokeballShakeAnim.setValue(0);
    pokeballScaleAnim.setValue(1);
    
    // Create a continuous shake loop
    const shakeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pokeballShakeAnim, { toValue: 15, duration: 100, useNativeDriver: true }),
        Animated.timing(pokeballShakeAnim, { toValue: -15, duration: 100, useNativeDriver: true }),
        Animated.timing(pokeballShakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
        Animated.timing(pokeballShakeAnim, { toValue: -10, duration: 80, useNativeDriver: true }),
        Animated.timing(pokeballShakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        Animated.delay(300),
      ])
    );
    
    pokeballShakeLoopRef.current = shakeLoop;
    shakeLoop.start();
  };

  const stopPokeballShake = () => {
    if (pokeballShakeLoopRef.current) {
      pokeballShakeLoopRef.current.stop();
      pokeballShakeLoopRef.current = null;
    }
    pokeballShakeAnim.setValue(0);
  };

  const playSuccessAnimation = (callback: () => void) => {
    stopPokeballShake();
    setShowCaptureResult('success');
    
    // Sparkle and scale animation for success
    Animated.parallel([
      Animated.sequence([
        Animated.timing(pokeballScaleAnim, { toValue: 1.2, duration: 200, useNativeDriver: true }),
        Animated.timing(pokeballScaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.timing(sparkleAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(callback, 500);
    });
  };

  const playEscapeAnimation = (callback: () => void) => {
    stopPokeballShake();
    setShowCaptureResult('escape');
    
    // Pokemon bursts out animation
    Animated.parallel([
      Animated.timing(pokeballScaleAnim, { toValue: 1.5, duration: 300, useNativeDriver: true }),
      Animated.timing(pokemonEscapeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(callback, 800);
    });
  };

  const startGameLoop = () => {
    console.log('startGameLoop called');
    const config = getBallConfig(selectedBall);
    let rarityDrainSpeed = getRarityDrainSpeed(rarity);
    let rarityMovement = getRarityMovement(rarity);
    
    // Apply berry effects
    if (selectedBerry === 'razz' || selectedBerry === 'goldenrazz') {
      const bonus = selectedBerry === 'goldenrazz' ? 0.4 : 0.2;
      config.fillSpeed += bonus;
    }
    if (selectedBerry === 'nanab') {
      rarityMovement.acceleration *= 0.6;
      rarityMovement.changeInterval *= 1.5;
    }
    
    let lastTargetChange = Date.now();
    let frameCount = 0;
    
    const loop = () => {
      if (!intervalRef.current) {
        console.log('Game loop stopped - intervalRef is null');
        return;
      }
      
      frameCount++;
      if (frameCount === 1) {
        console.log('First frame of game loop executing');
      }
      const now = Date.now();
      
      // Pokemon AI - rarity affects movement
      if (now - lastTargetChange > rarityMovement.changeInterval) {
        pokemonTargetRef.current = 20 + Math.random() * 60;
        lastTargetChange = now;
      }
      
      const targetDiff = pokemonTargetRef.current - pokemonPosRef.current;
      pokemonVelocityRef.current += targetDiff * rarityMovement.acceleration;
      pokemonVelocityRef.current *= rarityMovement.friction;
      pokemonPosRef.current += pokemonVelocityRef.current;
      pokemonPosRef.current = Math.max(10, Math.min(90, pokemonPosRef.current));
      
      // Zone movement with slower acceleration for easier gameplay
      if (isHoldingRef.current) {
        captureZoneVelocityRef.current += 0.08;
        captureZoneVelocityRef.current = Math.min(1.2, captureZoneVelocityRef.current);
      } else {
        captureZoneVelocityRef.current -= 0.08;
        captureZoneVelocityRef.current = Math.max(-1.2, captureZoneVelocityRef.current);
      }
      
      captureZonePosRef.current += captureZoneVelocityRef.current;
      captureZonePosRef.current = Math.max(10, Math.min(90, captureZonePosRef.current));
      
      // Animations
      pokemonAnim.setValue(pokemonPosRef.current);
      captureZoneAnim.setValue(captureZonePosRef.current);
      
      // Collision
      const zoneLeft = captureZonePosRef.current - config.sweetSpotSize / 2;
      const zoneRight = captureZonePosRef.current + config.sweetSpotSize / 2;
      const inZone = pokemonPosRef.current >= zoneLeft && pokemonPosRef.current <= zoneRight;
      
      progressRef.current += inZone ? config.fillSpeed : -rarityDrainSpeed;
      progressRef.current = Math.max(0, Math.min(100, progressRef.current));
      
      // Track quality metrics
      totalTimeRef.current++;
      if (inZone) timeInZoneRef.current++;
      tensionSamplesRef.current.push(progressRef.current);
      
      // Update UI every frame for ultra-smooth feedback
      setCaptureProgress(Math.floor(progressRef.current));
      progressAnim.setValue(progressRef.current);
      
      // Win/lose
      if (progressRef.current >= 100) {
        intervalRef.current = null;
        Vibration.vibrate([0, 100, 50, 100]);
        handleCaptureSuccess();
        return;
      } else if (progressRef.current <= 0) {
        intervalRef.current = null;
        Vibration.vibrate(200);
        handleCaptureFailure();
        return;
      }
      
      intervalRef.current = requestAnimationFrame(loop);
    };
    
    // Set a placeholder to pass the initial check
    intervalRef.current = 1 as any;
    console.log('Starting first requestAnimationFrame');
    intervalRef.current = requestAnimationFrame(loop);
    console.log('First requestAnimationFrame returned:', intervalRef.current);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        cancelAnimationFrame(intervalRef.current);
        intervalRef.current = null;
      }
      // Cleanup pokeball shake animation
      if (pokeballShakeLoopRef.current) {
        pokeballShakeLoopRef.current.stop();
        pokeballShakeLoopRef.current = null;
      }
    };
  }, []);

  const handleCaptureSuccess = async () => {
    setShowMinigame(false);
    
    const timeInZonePct = (timeInZoneRef.current / totalTimeRef.current) * 100;
    const avgTension = tensionSamplesRef.current.reduce((a, b) => a + b, 0) / tensionSamplesRef.current.length;
    const qualityScore = (timeInZonePct * 0.6) + (avgTension * 0.4);
    
    let quality: 'Nice'|'Great'|'Excellent' = 'Nice';
    if (qualityScore >= 75) quality = 'Excellent';
    else if (qualityScore >= 50) quality = 'Great';
    setCatchQuality(quality);
    
    // Play success animation with pokeball click
    playSuccessAnimation(async () => {
      Animated.timing(dimAnim, { toValue: 0, duration: 500, useNativeDriver: false }).start();
      
      const qualityBonus = quality === 'Excellent' ? 100 : quality === 'Great' ? 50 : 25;
      const baseXP = 100;
      const xp = baseXP + qualityBonus + (berryActive ? 10 : 0);
      let candy = Math.floor(Math.random() * 3) + 3;
      
      // Apply candy multiplier from berries
      if (selectedBerry === 'pinap') candy *= 2;
      if (selectedBerry === 'silverpinap') candy = Math.floor(candy * 1.5);
      setXpGained(xp);
      setCandyGained(candy);
      
      if (user) {
        try {
          const instance = await pokemonInstanceService.saveCaughtPokemon(user.uid, pokemon, rarity);
          await firebaseDiscoveryService.addCapturedPokemon(user.uid, pokemon, undefined, biome);
          const levelResult = await levelService.addXP(user.uid, xp);
          
          if (levelResult.leveledUp) {
            setTimeout(() => {
              Alert.alert('🎉 Level Up!', `You reached Level ${levelResult.newLevel}!`);
            }, 2000);
          }
          
          await offlineCacheService.syncToFirebase(user.uid);
        } catch (error) {
          await offlineCacheService.addToCache(`users/{userId}/caught/${pokemon.id}`, { pokemon, rarity, xp, biome });
          const cacheSize = await offlineCacheService.getCacheSize();
          if (cacheSize > 0) {
            setTimeout(() => {
              Alert.alert('Saved Offline', `Catch saved locally. ${cacheSize} pending sync.`);
            }, 2500);
          }
        }
      } else {
        await discoveryService.addDiscoveredPokemon(pokemon, undefined, biome);
      }
      
      const historyEntry = {
        pokemonId: pokemon.id,
        pokemonName: pokemon.name,
        timestamp: Date.now(),
        result: 'caught' as const,
        location: { latitude: 0, longitude: 0 },
        biome,
        rarity,
        ballUsed: selectedBall,
        xpGained: xp,
        candyGained: candy,
      };
      
      if (user) {
        await firebaseCatchHistoryService.addEntry(user.uid, historyEntry);
      } else {
        await catchHistoryService.addEntry(historyEntry);
      }
      
      setShowCaptureResult(null);
      setCaught(true);
      setTimeout(() => {
        navigation.goBack();
      }, 2500);
    });
  };

  const handleCaptureFailure = async () => {
    setShowMinigame(false);
    
    // Play escape animation with pokemon bursting out
    playEscapeAnimation(async () => {
      setAnnounceText('The Pokémon broke free and fled!');
      Animated.timing(dimAnim, { toValue: 0, duration: 300, useNativeDriver: false }).start();
      
      const historyEntry = {
        pokemonId: pokemon.id,
        pokemonName: pokemon.name,
        timestamp: Date.now(),
        result: 'fled' as const,
        location: { latitude: 0, longitude: 0 },
        biome,
        rarity,
        ballUsed: selectedBall,
      };
      
      if (user) {
        await firebaseCatchHistoryService.addEntry(user.uid, historyEntry);
      } else {
        await catchHistoryService.addEntry(historyEntry);
      }
      
      setShowCaptureResult(null);
      setEscaped(true);
      setTimeout(() => navigation.goBack(), 1500);
    });
  };

  const getBallLabel = (ballId: string) => {
    const labels: Record<string, string> = { pokeball: 'Standard', greatball: 'High Capture', ultraball: 'Very High' };
    return labels[ballId] || 'Standard';
  };

  const getBerryEffect = (berryId: string) => {
    const effects: Record<string, string> = { razz: 'Easier to catch', nanab: 'Calms Pokémon', pinap: 'More candy' };
    return effects[berryId] || 'Special effect';
  };

  const calculateRarity = (pokemon: Pokemon): 'common'|'uncommon'|'rare'|'epic'|'legendary' => {
    const totalStats = pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0);
    if (totalStats >= 670) return 'legendary';
    if (totalStats >= 580) return 'epic';
    if (totalStats >= 500) return 'rare';
    if (totalStats >= 400) return 'uncommon';
    return 'common';
  };

  const getBallConfig = (ballId: string) => {
    const configs: Record<string, any> = {
      pokeball: { sweetSpotSize: 30, fillSpeed: 0.32, color: '#FF5252', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png' },
      greatball: { sweetSpotSize: 34, fillSpeed: 0.48, color: '#2196F3', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png' },
      ultraball: { sweetSpotSize: 38, fillSpeed: 0.65, color: '#FFD700', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png' },
      masterball: { sweetSpotSize: 100, fillSpeed: 5.0, color: '#9C27B0', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png' },
    };
    return configs[ballId] || configs.pokeball;
  };

  const getRarityLabel = () => {
    const labels = { common: 'COMMON', uncommon: 'UNCOMMON', rare: 'RARE', epic: 'EPIC', legendary: 'LEGENDARY' };
    return labels[rarity];
  };

  const getRarityDrainSpeed = (rarity: 'common'|'uncommon'|'rare'|'epic'|'legendary') => {
    const drainSpeeds = { common: 0.18, uncommon: 0.16, rare: 0.14, epic: 0.12, legendary: 0.10 };
    return drainSpeeds[rarity];
  };

  const getRarityMovement = (rarity: 'common'|'uncommon'|'rare'|'epic'|'legendary') => {
    const movements = {
      common: { changeInterval: 2000 + Math.random() * 1500, acceleration: 0.006, friction: 0.92 },
      uncommon: { changeInterval: 1800 + Math.random() * 1200, acceleration: 0.008, friction: 0.91 },
      rare: { changeInterval: 1500 + Math.random() * 1000, acceleration: 0.010, friction: 0.90 },
      epic: { changeInterval: 1200 + Math.random() * 800, acceleration: 0.012, friction: 0.88 },
      legendary: { changeInterval: 1000 + Math.random() * 600, acceleration: 0.015, friction: 0.86 },
    };
    return movements[rarity];
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
      <Camera style={StyleSheet.absoluteFill} device={device} isActive={true} />

      {/* Hide pokemon when it's being captured in the pokeball */}
      {!showCaptureResult && (
        <Animated.View style={[styles.pokemonContainer, { transform: [{ translateY: bounceAnim }, { translateX: shakeAnim }, { scale: breatheAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }] }]}>
          <Image source={biomeConfig.platform} style={styles.biomePlatform} resizeMode="cover" />
          <Image source={{ uri: imageUrl }} style={styles.pokemonImage} resizeMode="contain" />
        </Animated.View>
      )}

      <View style={styles.infoPanel}>
        <Text style={styles.pokemonName}>{pokemon.name.toUpperCase()}</Text>
        <Text style={styles.pokemonType}>{pokemon.types.map(t => t.type.name).join(' • ')}</Text>
      </View>



      {announceText !== '' && (
        <View style={styles.announcer}>
          <Text style={styles.announcerText}>{announceText}</Text>
        </View>
      )}

      {showMinigame && (
        <View 
          onStartShouldSetResponder={() => true}
          onResponderGrant={() => { if (minigameReady) isHoldingRef.current = true; }}
          onResponderRelease={() => { isHoldingRef.current = false; }}
          onResponderTerminate={() => { isHoldingRef.current = false; }}
          style={styles.minigameOverlay}
        >
          <View style={styles.fishMinigameContainer} pointerEvents="box-none">
            <View style={styles.pokemonCaptureHeader}>
              <Text style={styles.captureTitle}>!</Text>
            </View>
            <View style={styles.tensionBarContainer}>
              <View style={styles.tensionBarHorizontal}>
                <Animated.View style={[styles.captureZone, { 
                  left: captureZoneAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
                  width: `${getBallConfig(selectedBall).sweetSpotSize}%`,
                  backgroundColor: getBallConfig(selectedBall).color,
                  marginLeft: `-${getBallConfig(selectedBall).sweetSpotSize / 2}%`
                }]} />
                <Animated.View style={[styles.pokemonIndicator, { 
                  left: pokemonAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
                }]} />
              </View>
            </View>
            <View style={styles.captureProgressContainer}>
              <View style={styles.progressBarOuter}>
                <Animated.View style={[styles.progressBarInner, { 
                  width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
                  backgroundColor: captureProgress < 30 ? '#FF5252' : captureProgress < 70 ? '#FFD700' : '#4CAF50',
                }]} />
              </View>
              <Text style={[styles.progressText, { color: captureProgress < 30 ? '#FF5252' : captureProgress < 70 ? '#FFD700' : '#4CAF50' }]}>{Math.floor(captureProgress)}%</Text>
            </View>
            <View style={styles.hintBox}>
              <Text style={styles.fishHint}>HOLD to move zone RIGHT!</Text>
              <Text style={styles.drainSpeedText}>{getRarityLabel()} • Drain: -{getRarityDrainSpeed(rarity).toFixed(2)}/tick</Text>
            </View>
          </View>
        </View>
      )}

      <Animated.View style={[styles.dimOverlay, { opacity: dimAnim }]} pointerEvents="none" />

      {!catching && !caught && !escaped && (
        <View style={styles.bottomPanel}>
          <View style={styles.tabContainer}>
            <TouchableOpacity style={[styles.tab, activeTab === 'capture' && styles.tabActive]} onPress={() => setActiveTab('capture')}>
              <Text style={[styles.tabText, activeTab === 'capture' && styles.tabTextActive]}>CAPTURE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === 'items' && styles.tabActive]} onPress={() => setActiveTab('items')}>
              <Text style={[styles.tabText, activeTab === 'items' && styles.tabTextActive]}>ITEMS</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'capture' ? (
            <View style={styles.capturePanel}>
              <Text style={styles.sectionTitle}>SELECT POKÉ BALL</Text>
              <View style={styles.ballGrid}>
                {inventory.filter(i => i.type.includes('ball')).map(item => {
                  const ballConfig = getBallConfig(item.id);
                  return (
                    <TouchableOpacity key={item.id} style={[styles.ballCard, selectedBall === item.id && styles.ballCardSelected]} onPress={() => setSelectedBall(item.id)} disabled={item.count === 0}>
                      {ballConfig.sprite ? (
                        <Image source={{ uri: ballConfig.sprite }} style={styles.ballSprite} />
                      ) : (
                        <Text style={styles.ballIcon}>{item.icon}</Text>
                      )}
                      <Text style={styles.ballName}>{item.name}</Text>
                      <Text style={styles.ballLabel}>{getBallLabel(item.id)}</Text>
                      <Text style={styles.ballCount}>x{item.count}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {showThrowButton && (
                <Animated.View style={[styles.throwButtonContainer, { opacity: throwButtonGlow.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }]}>
                  <TouchableOpacity style={styles.throwButton} onPress={handleThrow}>
                    <Text style={styles.throwButtonText}>THROW BALL</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </View>
          ) : (
            <View style={styles.itemsPanel}>
              <Text style={styles.sectionTitle}>USE BERRY</Text>
              {selectedBerry && (
                <View style={styles.activeEffectBanner}>
                  <Text style={styles.activeEffectText}>✓ {inventory.find(i => i.id === selectedBerry)?.name} ACTIVE</Text>
                </View>
              )}
              <View style={styles.berryGrid}>
                {inventory.filter(i => i.category === 'berry').map(item => {
                  const berrySprites: Record<string, string> = {
                    razz: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/razz-berry.png',
                    nanab: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/nanab-berry.png',
                    pinap: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/pinap-berry.png',
                  };
                  return (
                    <TouchableOpacity key={item.id} style={[styles.berryCard, selectedBerry === item.id && styles.berryCardActive]} onPress={() => useBerry(item.id)} disabled={berryActive || item.count === 0}>
                      {berrySprites[item.id] ? (
                        <Image source={{ uri: berrySprites[item.id] }} style={styles.berrySprite} />
                      ) : (
                        <Text style={styles.berryIcon}>{item.icon}</Text>
                      )}
                      <Text style={styles.berryName}>{item.name}</Text>
                      <Text style={styles.berryEffect}>{getBerryEffect(item.id)}</Text>
                      <Text style={styles.berryCount}>x{item.count}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Pokeball Capture Animation - positioned near the pokemon, not blocking gameplay */}
      {showCaptureResult && (
        <View style={styles.captureAnimationContainer} pointerEvents="none">
          {/* Pokeball */}
          <Animated.View style={[
            styles.pokeballAnimContainer,
            {
              transform: [
                { rotate: pokeballShakeAnim.interpolate({ inputRange: [-15, 0, 15], outputRange: ['-15deg', '0deg', '15deg'] }) },
                { scale: pokeballScaleAnim },
              ],
            },
          ]}>
            <Image
              source={{ uri: getBallConfig(selectedBall).sprite || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png' }}
              style={styles.pokeballAnimImage}
            />
          </Animated.View>
          
          {/* Success sparkles */}
          {showCaptureResult === 'success' && (
            <Animated.View style={[styles.sparkleContainer, { opacity: sparkleAnim }]}>
              <Text style={styles.sparkleText}>✨</Text>
              <Text style={[styles.sparkleText, styles.sparkleTopLeft]}>⭐</Text>
              <Text style={[styles.sparkleText, styles.sparkleTopRight]}>✨</Text>
              <Text style={[styles.sparkleText, styles.sparkleBottomLeft]}>⭐</Text>
              <Text style={[styles.sparkleText, styles.sparkleBottomRight]}>✨</Text>
            </Animated.View>
          )}
          
          {/* Escape animation - Pokemon bursting out */}
          {showCaptureResult === 'escape' && (
            <Animated.View style={[
              styles.escapeAnimContainer,
              {
                opacity: pokemonEscapeAnim,
                transform: [
                  { scale: pokemonEscapeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.5] }) },
                  { translateY: pokemonEscapeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -100] }) },
                ],
              },
            ]}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.escapePokemonImage}
              />
            </Animated.View>
          )}
        </View>
      )}

      {caught && <View style={styles.statusSurface}><Text style={styles.successText}>Gotcha!</Text><Text style={styles.successSubtext}>{pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)} was caught!</Text>{catchQuality && <Text style={styles.qualityBadge}>{catchQuality}!</Text>}<Text style={styles.rewardText}>+{xpGained} XP  •  +{candyGained} Candy</Text></View>}
      {escaped && <View style={styles.statusSurface}><Text style={styles.escapeText}>Oh no! The wild {pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)} fled!</Text></View>}

      <IconButton icon="arrow-left" mode="contained" onPress={() => navigation.goBack()} style={styles.backButton} />
    </View>
  );
};

type BiomeConfig = {
  platform: any;
};

const getBiomeConfig = (biome: string): BiomeConfig => {
  const configs: Record<string, BiomeConfig> = {
    water: { platform: { uri: 'https://static.vecteezy.com/system/resources/previews/024/090/811/non_2x/water-surface-texture-background-free-png.png' } },
    grass: { platform: { uri: 'https://www.pngitem.com/pimgs/m/74-746785_nj-coding-practice-pokemon-tall-grass-png-transparent.png' } },
    urban: { platform: { uri: 'https://static.vecteezy.com/system/resources/thumbnails/022/963/918/small_2x/ai-generative-fluffy-white-clouds-isolated-on-transparent-background-png.png' } },
    normal: { platform: { uri: 'https://www.pngitem.com/pimgs/m/74-746785_nj-coding-practice-pokemon-tall-grass-png-transparent.png' } },
  };
  return configs[biome] || configs.normal;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingText: { color: '#fff', fontSize: 18, textAlign: 'center', marginTop: 100 },

  pokemonContainer: { position: 'absolute', top: height * 0.2, alignSelf: 'center', width: width * 0.6, height: width * 0.6, justifyContent: 'center', alignItems: 'center', zIndex: 5 },
  pokemonImage: { width: '100%', height: '100%' },
  biomePlatform: { position: 'absolute', bottom: -30, width: '100%', height: 60, opacity: 0.8 },
  infoPanel: { position: 'absolute', top: 60, alignSelf: 'center', backgroundColor: '#F8F8F8', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, alignItems: 'center', zIndex: 10, borderWidth: 4, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 },
  pokemonName: { fontSize: 22, fontWeight: 'bold', color: '#000', letterSpacing: 1 },
  pokemonType: { fontSize: 12, color: '#666', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  announcer: { position: 'absolute', bottom: 280, alignSelf: 'center', backgroundColor: '#F8F8F8', paddingHorizontal: 28, paddingVertical: 16, borderRadius: 8, borderWidth: 4, borderColor: '#000', zIndex: 20, shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, minWidth: width * 0.85 },
  announcerText: { fontSize: 15, fontWeight: '600', color: '#000', textAlign: 'left', lineHeight: 22 },
  dimOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', zIndex: 8 },
  minigameOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 25, backgroundColor: 'rgba(0,0,0,0.85)' },
  fishMinigameContainer: { alignItems: 'center', gap: 20, padding: 20, width: width * 0.9 },
  pokemonCaptureHeader: { backgroundColor: '#F8F8F8', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, borderWidth: 4, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 },
  captureTitle: { fontSize: 32, fontWeight: 'bold', color: '#000', letterSpacing: 2 },
  tensionBarContainer: { width: '100%', alignItems: 'center' },
  tensionBarHorizontal: { width: width * 0.85, height: 50, backgroundColor: '#E0E0E0', borderRadius: 8, position: 'relative', borderWidth: 4, borderColor: '#000', overflow: 'visible', shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
  captureZone: { position: 'absolute', height: '100%', borderRadius: 4, opacity: 0.4, borderWidth: 3, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8 },
  pokemonIndicator: { position: 'absolute', height: '90%', width: 20, top: '5%', borderRadius: 6, backgroundColor: '#FF5252', borderWidth: 3, borderColor: '#000', marginLeft: -10 },
  captureProgressContainer: { width: '100%', alignItems: 'center', gap: 8 },
  progressBarOuter: { width: '100%', height: 32, backgroundColor: '#E0E0E0', borderRadius: 8, borderWidth: 4, borderColor: '#000', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
  progressBarInner: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 18, fontWeight: 'bold', color: '#F8F8F8', letterSpacing: 1 },
  hintBox: { backgroundColor: '#F8F8F8', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, borderWidth: 3, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
  fishHint: { fontSize: 13, color: '#000', letterSpacing: 0.5, fontWeight: '600' },
  drainSpeedText: { fontSize: 11, color: '#666', marginTop: 4, textAlign: 'center' },
  bottomPanel: { position: 'absolute', bottom: 0, width: width, backgroundColor: '#F8F8F8', borderTopWidth: 4, borderLeftWidth: 4, borderRightWidth: 4, borderColor: '#000', paddingBottom: 20, zIndex: 10 },
  tabContainer: { flexDirection: 'row', borderBottomWidth: 3, borderBottomColor: '#000' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E0E0E0' },
  tabActive: { backgroundColor: '#F8F8F8', borderBottomWidth: 0 },

  tabText: { fontSize: 14, fontWeight: 'bold', color: '#666', letterSpacing: 0.5 },
  tabTextActive: { color: '#000' },
  capturePanel: { padding: 20, paddingBottom: 10 },
  itemsPanel: { padding: 20, paddingBottom: 10 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#666', marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' },
  ballGrid: { flexDirection: 'row', gap: 10 },
  ballCard: { flex: 1, backgroundColor: '#FFF', padding: 14, borderRadius: 8, alignItems: 'center', borderWidth: 3, borderColor: '#CCC', shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.3, shadowRadius: 0 },
  ballCardSelected: { backgroundColor: '#FFF9C4', borderColor: '#000', shadowOffset: { width: 3, height: 3 } },
  ballIcon: { fontSize: 36, marginBottom: 6 },
  ballSprite: { width: 40, height: 40, marginBottom: 6 },
  ballName: { fontSize: 11, color: '#000', fontWeight: 'bold', textAlign: 'center' },
  ballLabel: { fontSize: 9, color: '#666', marginTop: 2, textAlign: 'center' },
  ballCount: { fontSize: 12, color: '#000', fontWeight: 'bold', marginTop: 4 },
  throwButtonContainer: { marginTop: 16, alignItems: 'center' },
  throwButton: { backgroundColor: '#FF5252', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 8, borderWidth: 4, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 },
  throwButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFF', letterSpacing: 1.5 },
  berryGrid: { flexDirection: 'row', gap: 10 },
  berryCard: { flex: 1, backgroundColor: '#FFF', padding: 14, borderRadius: 8, alignItems: 'center', borderWidth: 3, borderColor: '#CCC', shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.3, shadowRadius: 0 },
  berryCardActive: { backgroundColor: '#C8E6C9', borderColor: '#000', shadowOffset: { width: 3, height: 3 } },
  berryIcon: { fontSize: 36, marginBottom: 6 },
  berrySprite: { width: 40, height: 40, marginBottom: 6 },
  berryName: { fontSize: 11, color: '#000', fontWeight: 'bold', textAlign: 'center' },
  berryEffect: { fontSize: 9, color: '#666', marginTop: 2, textAlign: 'center' },
  berryCount: { fontSize: 12, color: '#000', fontWeight: 'bold', marginTop: 4 },
  activeEffectBanner: { backgroundColor: '#4CAF50', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, marginBottom: 12, borderWidth: 3, borderColor: '#000', alignItems: 'center' },
  activeEffectText: { fontSize: 12, fontWeight: 'bold', color: '#FFF', letterSpacing: 1 },
  statusSurface: { position: 'absolute', bottom: 250, alignSelf: 'center', backgroundColor: '#F8F8F8', padding: 24, borderRadius: 8, alignItems: 'center', zIndex: 10, borderWidth: 4, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, minWidth: width * 0.8 },
  successText: { fontSize: 28, fontWeight: 'bold', color: '#000', letterSpacing: 1 },
  successSubtext: { fontSize: 16, color: '#000', marginTop: 6, textTransform: 'capitalize' },
  qualityBadge: { fontSize: 20, fontWeight: 'bold', color: '#FFD700', marginTop: 8, letterSpacing: 1 },
  rewardText: { fontSize: 14, color: '#666', marginTop: 8, fontWeight: '600' },
  escapeText: { fontSize: 24, fontWeight: 'bold', color: '#000' },
  backButton: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
  
  // Pokeball capture animation styles - positioned near the pokemon, not blocking
  captureAnimationContainer: { position: 'absolute', top: height * 0.2 + (width * 0.3), alignSelf: 'center', alignItems: 'center', justifyContent: 'center', zIndex: 6 },
  pokeballAnimContainer: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center' },
  pokeballAnimImage: { width: 60, height: 60 },
  sparkleContainer: { position: 'absolute', width: 150, height: 150, justifyContent: 'center', alignItems: 'center' },
  sparkleText: { fontSize: 24, position: 'absolute' },
  sparkleTopLeft: { top: 10, left: 20 },
  sparkleTopRight: { top: 10, right: 20 },
  sparkleBottomLeft: { bottom: 20, left: 10 },
  sparkleBottomRight: { bottom: 20, right: 10 },
  escapeAnimContainer: { position: 'absolute', width: 120, height: 120, justifyContent: 'center', alignItems: 'center' },
  escapePokemonImage: { width: 100, height: 100 },
});

export default ARCaptureScreen;

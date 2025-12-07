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
  const [sweetSpotPos, setSweetSpotPos] = useState(50);
  const [announceText, setAnnounceText] = useState('');
  const [showThrowButton, setShowThrowButton] = useState(true);
  const [isHolding, setIsHolding] = useState(false);
  const isHoldingRef = useRef(false);
  const [rarity, setRarity] = useState<'common'|'uncommon'|'rare'|'epic'|'legendary'>('common');
  const [minigameReady, setMinigameReady] = useState(false);
  const indicatorPosRef = useRef(50);
  const velocityRef = useRef(0);
  
  const device = useCameraDevice('back');
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const circleAnim = useRef(new Animated.Value(1)).current;
  const breatheAnim = useRef(new Animated.Value(0)).current;
  const minigameIndicator = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const throwButtonGlow = useRef(new Animated.Value(0)).current;
  const dimAnim = useRef(new Animated.Value(0)).current;

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

  const useBerry = async (berryType: string) => {
    const success = user ? await firebaseInventoryService.useItem(user.uid, berryType) : await inventoryService.useItem(berryType);
    if (!success) return;
    
    setSelectedBerry(berryType);
    setBerryActive(true);
    setAnnounceText(`You used a ${inventory.find(i => i.id === berryType)?.name}!\nThe wild Pokémon is calmer now.`);
    const inv = user ? await firebaseInventoryService.getInventory(user.uid) : await inventoryService.getInventory();
    setInventory(inv);
  };

  const handleThrow = async () => {
    const canUse = user ? await firebaseInventoryService.useItem(user.uid, selectedBall) : await inventoryService.useItem(selectedBall);
    if (!canUse) { alert('No Poké Balls left!'); return; }
    
    const inv = user ? await firebaseInventoryService.getInventory(user.uid) : await inventoryService.getInventory();
    setInventory(inv);
    
    setAnnounceText(`You threw a ${inventory.find(i => i.id === selectedBall)?.name}!`);
    setCatching(true);
    setShowThrowButton(false);
    
    setTimeout(() => startBallShake(), 800);
  };

  const startBallShake = () => {
    setAnnounceText('The wild Pokémon is watching carefully...\nGet ready!');
    Animated.timing(dimAnim, { toValue: 0.6, duration: 300, useNativeDriver: false }).start();
    
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 150, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 150, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setShowMinigame(true);
      startMinigame();
    });
  };

  const startMinigame = () => {
    const config = getBallConfig(selectedBall);
    setSweetSpotPos(50);
    indicatorPosRef.current = 50;
    velocityRef.current = 0;
    minigameIndicator.setValue(50);
    setCaptureProgress(0);
    progressAnim.setValue(0);
    setMinigameReady(false);
    setAnnounceText('GET READY...');
    
    setTimeout(() => {
      setMinigameReady(true);
      setAnnounceText('');
    }, 1000);
    
    let progress = 0;
    let sweetPos = 50;
    let sweetDirection = 1;
    const rarityDrainSpeed = getRarityDrainSpeed(rarity);
    
    const interval = setInterval(() => {
      const distance = Math.abs(indicatorPosRef.current - sweetPos);
      const inZone = distance < config.sweetSpotSize / 2;
      
      if (inZone) {
        progress += config.fillSpeed;
      } else {
        progress -= rarityDrainSpeed;
      }
      
      progress = Math.max(0, Math.min(100, progress));
      setCaptureProgress(progress);
      progressAnim.setValue(progress);
      
      if (Math.random() < 0.015) {
        sweetDirection = Math.random() > 0.5 ? 1 : -1;
      }
      sweetPos += sweetDirection * config.sweetSpotSpeed;
      if (sweetPos < 20) { sweetPos = 20; sweetDirection = 1; }
      if (sweetPos > 80) { sweetPos = 80; sweetDirection = -1; }
      setSweetSpotPos(sweetPos);
      
      if (progress >= 100) {
        clearInterval(interval);
        handleCaptureSuccess();
      } else if (progress <= 0) {
        clearInterval(interval);
        handleCaptureFailure();
      }
    }, 33);
  };

  const handleHoldStart = () => { 
    if (minigameReady) {
      isHoldingRef.current = true;
    }
  };
  const handleHoldEnd = () => {
    isHoldingRef.current = false;
  };

  useEffect(() => {
    if (showMinigame && minigameReady) {
      const movement = setInterval(() => {
        if (isHoldingRef.current) {
          velocityRef.current = Math.min(3.0, velocityRef.current + 0.3);
        } else {
          velocityRef.current = Math.max(-3.0, velocityRef.current - 0.3);
        }
        
        velocityRef.current *= 0.88;
        const newPos = indicatorPosRef.current + velocityRef.current;
        indicatorPosRef.current = Math.max(2, Math.min(98, newPos));
        minigameIndicator.setValue(indicatorPosRef.current);
      }, 16);
      return () => clearInterval(movement);
    }
  }, [showMinigame, minigameReady]);

  const handleCaptureSuccess = async () => {
    setShowMinigame(false);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 20, duration: 200, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
    Animated.timing(dimAnim, { toValue: 0, duration: 500, useNativeDriver: false }).start();
    
    setTimeout(async () => {
      const xp = Math.floor(100 + captureProgress * 2 + (berryActive ? 25 : 0));
      const candy = Math.floor(Math.random() * 3) + 3;
      setXpGained(xp);
      setCandyGained(candy);
      
      if (user) {
        const instance = await pokemonInstanceService.saveCaughtPokemon(user.uid, pokemon, rarity);
        await firebaseDiscoveryService.addCapturedPokemon(user.uid, pokemon, undefined, biome);
      } else {
        await discoveryService.addDiscoveredPokemon(pokemon, undefined, biome);
      }
      
      setCaught(true);
      setTimeout(() => {
        navigation.goBack();
      }, 2500);
    }, 500);
  };

  const handleCaptureFailure = () => {
    setShowMinigame(false);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 30, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -30, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
    setAnnounceText('Oh no! The Pokémon broke free!');
    Animated.timing(dimAnim, { toValue: 0, duration: 300, useNativeDriver: false }).start();
    
    setTimeout(() => {
      const escapeChance = Math.random();
      if (escapeChance < 0.3) {
        setEscaped(true);
        setTimeout(() => navigation.goBack(), 1500);
      } else {
        setCatching(false);
        setAnnounceText('');
      }
    }, 1000);
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
      pokeball: { sweetSpotSize: 18, fillSpeed: 0.9, sweetSpotSpeed: 0.6, color: '#FF5252', barWidth: 20 },
      greatball: { sweetSpotSize: 22, fillSpeed: 1.4, sweetSpotSpeed: 0.45, color: '#2196F3', barWidth: 28 },
      ultraball: { sweetSpotSize: 26, fillSpeed: 2.0, sweetSpotSpeed: 0.3, color: '#FFD700', barWidth: 36 },
    };
    return configs[ballId] || configs.pokeball;
  };

  const getRarityLabel = () => {
    const labels = { common: 'COMMON', uncommon: 'UNCOMMON', rare: 'RARE', epic: 'EPIC', legendary: 'LEGENDARY' };
    return labels[rarity];
  };

  const getRarityDrainSpeed = (rarity: 'common'|'uncommon'|'rare'|'epic'|'legendary') => {
    const drainSpeeds = { common: 0.20, uncommon: 0.16, rare: 0.12, epic: 0.08, legendary: 0.05 };
    return drainSpeeds[rarity];
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

      <Animated.View style={[styles.pokemonContainer, { transform: [{ translateY: bounceAnim }, { translateX: shakeAnim }, { scale: breatheAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }] }]}>
        <Image source={biomeConfig.platform} style={styles.biomePlatform} resizeMode="cover" />
        <Image source={{ uri: imageUrl }} style={styles.pokemonImage} resizeMode="contain" />
      </Animated.View>

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
          onResponderGrant={handleHoldStart}
          onResponderRelease={handleHoldEnd}
          onResponderTerminate={handleHoldEnd}
          style={styles.minigameOverlay}
        >
          <View style={styles.fishMinigameContainer} pointerEvents="box-none">
            <View style={styles.pokemonCaptureHeader}>
              <Text style={styles.captureTitle}>!</Text>
            </View>
            <View style={styles.tensionBarContainer}>
              <View style={styles.tensionBarHorizontal}>
                <Animated.View style={[styles.sweetSpotHorizontal, { 
                  left: `${sweetSpotPos - getBallConfig(selectedBall).sweetSpotSize / 2}%`, 
                  width: `${getBallConfig(selectedBall).sweetSpotSize}%`,
                  backgroundColor: getBallConfig(selectedBall).color,
                }]} />
                <Animated.View style={[styles.indicatorHorizontal, { 
                  left: minigameIndicator.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
                  width: getBallConfig(selectedBall).barWidth,
                  backgroundColor: getBallConfig(selectedBall).color,
                }]} />
              </View>
            </View>
            <View style={styles.captureProgressContainer}>
              <View style={styles.progressBarOuter}>
                <Animated.View style={[styles.progressBarInner, { 
                  width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
                  backgroundColor: getBallConfig(selectedBall).color,
                }]} />
              </View>
              <Text style={styles.progressText}>{Math.floor(captureProgress)}%</Text>
            </View>
            <View style={styles.hintBox}>
              <Text style={styles.fishHint}>HOLD to move right!</Text>
              <Text style={styles.drainSpeedText}>Drain: -{getRarityDrainSpeed(rarity).toFixed(2)}/tick ({getRarityLabel()})</Text>
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
                {inventory.filter(i => i.type.includes('ball')).map(item => (
                  <TouchableOpacity key={item.id} style={[styles.ballCard, selectedBall === item.id && styles.ballCardSelected]} onPress={() => setSelectedBall(item.id)} disabled={item.count === 0}>
                    <Text style={styles.ballIcon}>{item.icon}</Text>
                    <Text style={styles.ballName}>{item.name}</Text>
                    <Text style={styles.ballLabel}>{getBallLabel(item.id)}</Text>
                    <Text style={styles.ballCount}>x{item.count}</Text>
                  </TouchableOpacity>
                ))}
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
              <View style={styles.berryGrid}>
                {inventory.filter(i => i.type.includes('razz') || i.type.includes('nanab')).map(item => (
                  <TouchableOpacity key={item.id} style={[styles.berryCard, selectedBerry === item.id && styles.berryCardActive]} onPress={() => useBerry(item.id)} disabled={berryActive || item.count === 0}>
                    <Text style={styles.berryIcon}>{item.icon}</Text>
                    <Text style={styles.berryName}>{item.name}</Text>
                    <Text style={styles.berryEffect}>{getBerryEffect(item.id)}</Text>
                    <Text style={styles.berryCount}>x{item.count}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {caught && <View style={styles.statusSurface}><Text style={styles.successText}>Gotcha!</Text><Text style={styles.successSubtext}>{pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)} was caught!</Text><Text style={styles.rewardText}>+{xpGained} XP  •  +{candyGained} Candy</Text></View>}
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
  tensionBarHorizontal: { width: width * 0.85, height: 50, backgroundColor: '#E0E0E0', borderRadius: 8, position: 'relative', borderWidth: 4, borderColor: '#000', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
  sweetSpotHorizontal: { position: 'absolute', height: '100%', borderRadius: 4, opacity: 0.4, borderWidth: 2, borderColor: '#000' },
  indicatorHorizontal: { position: 'absolute', height: '90%', borderRadius: 6, top: '5%', borderWidth: 4, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0 },
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
  berryName: { fontSize: 11, color: '#000', fontWeight: 'bold', textAlign: 'center' },
  berryEffect: { fontSize: 9, color: '#666', marginTop: 2, textAlign: 'center' },
  berryCount: { fontSize: 12, color: '#000', fontWeight: 'bold', marginTop: 4 },
  statusSurface: { position: 'absolute', bottom: 250, alignSelf: 'center', backgroundColor: '#F8F8F8', padding: 24, borderRadius: 8, alignItems: 'center', zIndex: 10, borderWidth: 4, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, minWidth: width * 0.8 },
  successText: { fontSize: 28, fontWeight: 'bold', color: '#000', letterSpacing: 1 },
  successSubtext: { fontSize: 16, color: '#000', marginTop: 6, textTransform: 'capitalize' },
  rewardText: { fontSize: 14, color: '#666', marginTop: 8, fontWeight: '600' },
  escapeText: { fontSize: 24, fontWeight: 'bold', color: '#000' },
  backButton: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
});

export default ARCaptureScreen;

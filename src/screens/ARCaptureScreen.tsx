import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Pokemon } from '../services/pokeApi';
import { discoveryService } from '../services/discoveryService';

const { width } = Dimensions.get('window');

const ARCaptureScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { pokemon, biome } = route.params as { pokemon: Pokemon; biome: string };
  
  const [catching, setCatching] = useState(false);
  const [caught, setCaught] = useState(false);
  const bounceAnim = new Animated.Value(0);
  const shakeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -20,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1000,
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

  return (
    <View style={styles.container}>
      <View style={styles.arView}>
        <View style={styles.biomeOverlay}>
          <Text style={styles.biomeText}>📍 {biome.toUpperCase()} BIOME</Text>
        </View>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  arView: { flex: 1, backgroundColor: '#87CEEB', justifyContent: 'center', alignItems: 'center' },
  biomeOverlay: { position: 'absolute', top: 60, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  biomeText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  pokemonContainer: { width: width * 0.7, height: width * 0.7, justifyContent: 'center', alignItems: 'center' },
  pokemonImage: { width: '100%', height: '100%' },
  infoPanel: { position: 'absolute', top: 120, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 25, alignItems: 'center' },
  pokemonName: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  pokemonType: { fontSize: 16, color: '#666', marginTop: 5, textTransform: 'uppercase' },
  catchButton: { position: 'absolute', bottom: 100, backgroundColor: '#FF0000', paddingHorizontal: 40, paddingVertical: 20, borderRadius: 50, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
  catchButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  statusContainer: { position: 'absolute', bottom: 100, alignItems: 'center' },
  statusText: { fontSize: 24, fontWeight: 'bold', color: '#FFD700' },
  successText: { fontSize: 32, fontWeight: 'bold', color: '#FFD700' },
  successSubtext: { fontSize: 18, color: '#fff', marginTop: 10, textTransform: 'capitalize' },
  backButton: { position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20 },
  backButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default ARCaptureScreen;
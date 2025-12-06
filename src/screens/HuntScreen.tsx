import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  IconButton,
  SegmentedButtons,
  Text,
  useTheme,
} from 'react-native-paper';
import { locationService, Location, PokemonEncounter } from '../services/locationService';
import { pokeApi, Pokemon } from '../services/pokeApi';
import { discoveryService } from '../services/discoveryService';
import { LazyImage } from '../components/LazyImage';
import { imageCacheService } from '../services/imageCache';
import Screen from '../components/ui/Screen';
import SectionCard from '../components/ui/SectionCard';
import type { PokemonTheme } from '../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

const HuntScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useTheme<PokemonTheme>();
  const [location, setLocation] = useState<Location | null>(null);
  const [encounters, setEncounters] = useState<PokemonEncounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [pokemonData, setPokemonData] = useState<{ [key: number]: Pokemon }>({});
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState<'map' | 'list'>('map');
  const [locationWatcher, setLocationWatcher] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeHunt();
        const watcher = await locationService.watchLocation((newLocation) => {
          setLocation(newLocation);
        });
        setLocationWatcher(watcher);
      } catch (initError) {
        console.error('Hunt initialization failed:', initError);
      }
    };
    init();

    return () => {
      if (locationWatcher) {
        locationWatcher.remove();
      }
    };
  }, []);

  useEffect(() => {
    const checkDiscovered = async () => {
      const discovered = await discoveryService.getDiscoveredPokemon();
      const discoveredIds = discovered.map((p) => p.id);
      setEncounters((prev) =>
        prev.map((enc) => ({
          ...enc,
          discovered: discoveredIds.includes(enc.id),
        }))
      );
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
      const newEncounters = locationService.generatePokemonEncounters(currentLocation);

      const pokemonDataMap: { [key: number]: Pokemon } = {};
      const spritesToPreload: string[] = [];

      for (const encounter of newEncounters) {
        try {
          const pokemon = await pokeApi.getPokemon(encounter.id);
          pokemonDataMap[encounter.id] = pokemon;

          if (pokemon.sprites.front_default) {
            spritesToPreload.push(pokemon.sprites.front_default);
          }
        } catch (pokemonError) {
          console.error(`Failed to load Pokemon ${encounter.id}:`, pokemonError);
        }
      }

      await imageCacheService.preloadImages(spritesToPreload);

      setLocation(currentLocation);
      setEncounters(newEncounters);
      setPokemonData(pokemonDataMap);
    } catch (initializeError: any) {
      console.error('Hunt error:', initializeError);
      setError(initializeError.message || 'Failed to initialize');
    } finally {
      setLoading(false);
    }
  };

  const handleEncounterPress = (encounter: PokemonEncounter) => {
    if (!location) return;

    const distance = locationService.calculateDistance(location, encounter.location);
    const pokemon = pokemonData[encounter.id];

    if (!pokemon) return;

    if (distance > 100) {
      return;
    }

    navigation.navigate('ARCapture', { pokemon, biome: encounter.biome });
  };

  const refreshHunt = () => {
    initializeHunt();
  };

  const calculateMapPosition = (pokemonLat: number, pokemonLng: number) => {
    if (!location) return { x: 50, y: 50 };
    const latDiff = (pokemonLat - location.latitude) * 100000;
    const lngDiff = (pokemonLng - location.longitude) * 100000;

    const x = 50 + lngDiff * 5;
    const y = 50 - latDiff * 5;

    return { x: Math.max(10, Math.min(90, x)), y: Math.max(10, Math.min(90, y)) };
  };

  const renderEncounter = ({ item }: { item: PokemonEncounter }) => {
    const pokemon = pokemonData[item.id];
    const distance = location && locationService.calculateDistance(location, item.location);
    const inRange = typeof distance === 'number' && distance < 100;

    return (
      <Card
        mode="elevated"
        onPress={() => handleEncounterPress(item)}
        style={[
          styles.encounterCard,
          {
            borderColor: inRange ? theme.colors.primary : theme.colors.outlineVariant,
            borderWidth: inRange ? 2 : 1,
            opacity: item.discovered ? 0.6 : 1,
          },
        ]}
      >
        <Card.Content style={styles.encounterContent}>
          {pokemon && (
            <LazyImage
              source={{ uri: pokemon.sprites.front_default }}
              style={styles.pokemonSprite}
              showLoading
              loadingSize="small"
              fadeInDuration={300}
            />
          )}
          <View style={styles.encounterDetails}>
            <View style={styles.encounterHeader}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, textTransform: 'capitalize' }}>
                {pokemon?.name || 'Unknown'}
              </Text>
              {item.discovered ? (
                <Chip icon="check" compact style={styles.statusChip}>
                  Caught
                </Chip>
              ) : inRange ? (
                <Chip
                  compact
                  style={[styles.statusChip, { backgroundColor: theme.colors.primary }]}
                  textStyle={{ color: theme.colors.onPrimary }}
                >
                  In Range
                </Chip>
              ) : null}
            </View>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Biome: {item.biome}
            </Text>
            {typeof distance === 'number' && (
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {Math.round(distance)}m away
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator animating size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
            Searching for Pokémon...
          </Text>
        </View>
      </Screen>
    );
  }

  if (!location && !loading) {
    return (
      <Screen>
        <SectionCard title="Location required" subtitle={error || 'Unable to get location'}>
          <Button mode="contained" icon="refresh" onPress={initializeHunt}>
            Try Again
          </Button>
        </SectionCard>
      </Screen>
    );
  }

  if (!location) return null;

  const MapScreen = require('./MapScreen').default;

  return (
    <Screen>
      <View style={styles.container}>
        <SectionCard
          title="Hunt Mode"
          subtitle={`${encounters.filter((e) => e.discovered).length}/${encounters.length} caught`}
          actions={
            <IconButton icon="refresh" onPress={refreshHunt} accessibilityLabel="Refresh encounters" />
          }
        >
          <SegmentedButtons
            value={showMap}
            onValueChange={(value) => setShowMap(value as 'map' | 'list')}
            buttons={[
              { value: 'map', label: 'Map', icon: 'map' },
              { value: 'list', label: 'List', icon: 'format-list-bulleted' },
            ]}
          />
        </SectionCard>

        {showMap === 'map' ? (
          <View style={styles.mapContainer}>
            <MapScreen />
          </View>
        ) : (
          <FlatList
            data={encounters}
            renderItem={renderEncounter}
            keyExtractor={(_, index) => index.toString()}
            contentContainerStyle={{ paddingBottom: theme.custom.spacing.xl }}
            showsVerticalScrollIndicator={false}
          />
        )}

        <SectionCard title="Tips">
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Get within 100 meters of a Pokémon to trigger AR capture. Refresh to generate new encounters nearby.
          </Text>
        </SectionCard>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  encounterCard: {
    marginBottom: 12,
  },
  encounterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  pokemonSprite: {
    width: 60,
    height: 60,
  },
  encounterDetails: {
    flex: 1,
    gap: 4,
  },
  encounterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
});

export default HuntScreen;
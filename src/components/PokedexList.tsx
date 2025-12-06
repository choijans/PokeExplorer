import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  Alert,
  Platform,
  PermissionsAndroid,
  ListRenderItemInfo,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import { PERMISSIONS, request, RESULTS } from 'react-native-permissions';
import {
  ActivityIndicator,
  Banner,
  Button,
  IconButton,
  Searchbar,
  Text,
  useTheme,
} from 'react-native-paper';
import PokemonCard from './PokemonCard';
import Screen from './ui/Screen';
import SectionCard from './ui/SectionCard';
import { Pokemon, pokeApi } from '../services/pokeApi';
import { discoveryService } from '../services/discoveryService';
import { imageCacheService } from '../services/imageCache';
import type { PokemonTheme } from '../theme';

const PokedexList: React.FC = () => {
  const navigation = useNavigation();
  const theme = useTheme<PokemonTheme>();
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(false);
  const [discoveredIds, setDiscoveredIds] = useState<Set<number>>(new Set());
  const [isListening, setIsListening] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(true);
  const [showVoiceBanner, setShowVoiceBanner] = useState(false);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const results = await pokeApi.searchPokemon(query);
      setSearchResults(results);
      if (results.length === 0) {
        Alert.alert('No Results', `No Pokémon found for "${query}"`);
      }
    } catch (err) {
      console.error('Search error:', err);
      Alert.alert('Error', 'Pokémon not found');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const setupVoiceRecognition = useCallback(() => {
    Voice.onSpeechStart = () => {
      setIsListening(true);
    };

    Voice.onSpeechEnd = () => {
      setIsListening(false);
    };

    Voice.onSpeechResults = (event: SpeechResultsEvent) => {
      if (event.value && event.value.length > 0) {
        const recognizedText = event.value[0];
        setSearchQuery(recognizedText);
        performSearch(recognizedText);
      }
    };

    Voice.onSpeechError = (event: SpeechErrorEvent) => {
      setIsListening(false);

      if (event.error?.message && event.error.message !== 'No speech input') {
        Alert.alert('Voice Recognition Error', 'Could not recognize speech. Please try again.');
      }
    };
  }, [performSearch]);

  useEffect(() => {
    loadInitialPokemon();
    loadDiscoveredPokemon();
    setupVoiceRecognition();

    if (!Voice || typeof Voice.start !== 'function') {
      setVoiceAvailable(false);
      setShowVoiceBanner(true);
    }

    return () => {
      if (Voice && Voice.destroy) {
        Voice.destroy().then(Voice.removeAllListeners).catch((error) => console.log('Voice cleanup error:', error));
      }
    };
  }, [setupVoiceRecognition]);

  const loadDiscoveredPokemon = async () => {
    const discovered = await discoveryService.getDiscoveredPokemon();
    setDiscoveredIds(new Set(discovered.map((p) => p.id)));
  };

  const loadInitialPokemon = async () => {
    setLoading(true);
    const connectionOk = await pokeApi.testConnection();
    if (!connectionOk) {
      Alert.alert('Connection Error', 'Cannot connect to Pokémon API.');
      setLoading(false);
      return;
    }

    try {
      const list = await pokeApi.getPokemonList(20, 0);
      const pokemonList: Pokemon[] = [];
      const pokemonIds: number[] = [];

      for (const item of list) {
        const id = parseInt(item.url.split('/')[6], 10);
        pokemonIds.push(id);
      }

      for (const id of pokemonIds) {
        const poke = await pokeApi.getPokemon(id);
        pokemonList.push(poke);
        imageCacheService.prefetchPokemonSprites(id);
      }
      setPokemon(pokemonList);
    } catch (err) {
      console.error('Error loading Pokémon:', err);
      Alert.alert('Error', 'Unable to load Pokémon.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    await performSearch(searchQuery);
  };

  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
          title: 'Microphone Permission',
          message: 'PokeExplorer needs access to your microphone for voice search.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        });
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const speechResult = await request(PERMISSIONS.IOS.SPEECH_RECOGNITION);
        const micResult = await request(PERMISSIONS.IOS.MICROPHONE);
        return speechResult === RESULTS.GRANTED && micResult === RESULTS.GRANTED;
      }
    } catch (err) {
      console.error('Permission request error:', err);
      return false;
    }
  };

  const startVoiceRecognition = async () => {
    try {
      if (!voiceAvailable || !Voice || typeof Voice.start !== 'function') {
        setVoiceAvailable(false);
        setShowVoiceBanner(true);
        Alert.alert(
          'Voice Recognition Unavailable',
          'Voice recognition is not available on this device. Please use the text search instead.'
        );
        return;
      }

      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Microphone permission is required for voice search.');
        return;
      }

      setIsListening(true);
      await Voice.start('en-US');
    } catch (err: any) {
      console.error('Error starting voice recognition:', err);
      setIsListening(false);
      setVoiceAvailable(false);
      setShowVoiceBanner(true);
      Alert.alert('Voice Recognition Not Supported', 'Please use the text search feature instead.');
    }
  };

  const stopVoiceRecognition = async () => {
    try {
      await Voice.stop();
      setIsListening(false);
    } catch (err) {
      console.error('Error stopping voice recognition:', err);
      setIsListening(false);
    }
  };

  const handlePokemonPress = (selectedPokemon: Pokemon) => {
    const parentNavigation = navigation.getParent();
    if (parentNavigation) {
      parentNavigation.navigate('PokedexDetail', { pokemon: selectedPokemon });
    }
  };

  const renderPokemonItem = ({ item }: ListRenderItemInfo<Pokemon>) => (
    <PokemonCard pokemon={item} onPress={() => handlePokemonPress(item)} isDiscovered={discoveredIds.has(item.id)} />
  );

  const displayData = searchResults.length > 0 ? searchResults : pokemon;
  const showEmptyState = !loading && displayData.length === 0;

  return (
    <Screen>
      <View style={[styles.root, { gap: theme.custom.spacing.lg }]}> 
        <View style={styles.header}>
          <Text variant="headlineMedium" style={{ color: theme.colors.onSurface }}>
            Pokédex
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Search Pokémon, track your discoveries, and jump into detailed stats.
          </Text>
        </View>

        <SectionCard>
          <View style={{ gap: theme.custom.spacing.md }}>
            <Searchbar
              placeholder="Search Pokémon by name or ID"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              icon="magnify"
              right={(props) => (
                <IconButton
                  {...props}
                  icon={
                    !voiceAvailable ? 'microphone-off' : isListening ? 'stop-circle' : 'microphone'
                  }
                  disabled={!voiceAvailable && !isListening}
                  onPress={isListening ? stopVoiceRecognition : startVoiceRecognition}
                  accessibilityLabel="Toggle voice search"
                />
              )}
            />
            <View style={styles.searchActions}>
              <Button
                mode="contained"
                icon="magnify"
                onPress={handleSearch}
                loading={loading}
                style={styles.actionButton}
              >
                Search
              </Button>
              <Button
                mode="contained-tonal"
                icon="refresh"
                onPress={loadInitialPokemon}
                disabled={loading}
                style={styles.actionButton}
              >
                Refresh
              </Button>
            </View>
          </View>
        </SectionCard>

        <Banner
          visible={showVoiceBanner}
          icon="microphone-off"
          actions={[
            {
              label: 'Dismiss',
              onPress: () => setShowVoiceBanner(false),
            },
          ]}
        >
          Voice search is unavailable on this device. Continue using text search to explore the Pokédex.
        </Banner>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator animating size="large" color={theme.colors.primary} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
              Loading Pokémon...
            </Text>
          </View>
        ) : showEmptyState ? (
          <SectionCard title="No Pokémon Found" subtitle="Try adjusting your search terms">
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              We couldn’t find any Pokémon matching your search.
            </Text>
          </SectionCard>
        ) : (
          <FlatList
            data={displayData}
            renderItem={renderPokemonItem}
            keyExtractor={(item) => item.id.toString()}
            numColumns={1}
            contentContainerStyle={{ paddingBottom: theme.custom.spacing.xl }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    gap: 4,
  },
  searchActions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PokedexList;
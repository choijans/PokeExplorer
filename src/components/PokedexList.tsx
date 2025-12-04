import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import { PERMISSIONS, request, RESULTS } from 'react-native-permissions';
import PokemonCard from './PokemonCard';
import { Pokemon, pokeApi } from '../services/pokeApi';
import { discoveryService } from '../services/discoveryService';

const PokedexList: React.FC = () => {
  const navigation = useNavigation();
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(false);
  const [discoveredIds, setDiscoveredIds] = useState<Set<number>>(new Set());
  const [isListening, setIsListening] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(true);

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
        Alert.alert('No Results', `No Pokemon found for "${query}"`);
      }
    } catch (err) {
      console.error('Search error:', err);
      Alert.alert('Error', 'Pokemon not found');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const setupVoiceRecognition = useCallback(() => {
    Voice.onSpeechStart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
    };

    Voice.onSpeechEnd = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
    };

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      console.log('Speech results:', e.value);
      if (e.value && e.value.length > 0) {
        const recognizedText = e.value[0];
        setSearchQuery(recognizedText);
        // Automatically trigger search after speech recognition
        performSearch(recognizedText);
      }
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      console.log('Speech error:', e.error);
      setIsListening(false);
      
      if (e.error?.message && e.error.message !== 'No speech input') {
        Alert.alert('Voice Recognition Error', 'Could not recognize speech. Please try again.');
      }
    };
  }, [performSearch]);

  useEffect(() => {
    loadInitialPokemon();
    loadDiscoveredPokemon();
    setupVoiceRecognition();
    
    // Check if Voice module is available
    if (!Voice || typeof Voice.start !== 'function') {
      console.warn('Voice module not available - likely Xiaomi/Huawei device or RN 0.82 compatibility issue');
      setVoiceAvailable(false);
    }

    return () => {
      if (Voice && Voice.destroy) {
        Voice.destroy().then(Voice.removeAllListeners).catch(e => console.log('Voice cleanup error:', e));
      }
    };
  }, [setupVoiceRecognition]);

  const loadDiscoveredPokemon = async () => {
    const discovered = await discoveryService.getDiscoveredPokemon();
    setDiscoveredIds(new Set(discovered.map(p => p.id)));
  };

  const loadInitialPokemon = async () => {
    setLoading(true);
    const connectionOk = await pokeApi.testConnection();
    if (!connectionOk) {
      Alert.alert('Connection Error', 'Cannot connect to Pokemon API.');
      setLoading(false);
      return;
    }

    try {
      const list = await pokeApi.getPokemonList(20, 0);
      const pokemonList: Pokemon[] = [];
      for (const item of list) {
        const id = parseInt(item.url.split('/')[6], 10);
        const poke = await pokeApi.getPokemon(id);
        pokemonList.push(poke);
      }
      setPokemon(pokemonList);
    } catch (err) {
      console.error('Error loading Pokemon:', err);
      Alert.alert('Error', 'Unable to load Pokemon.');
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
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'PokeExplorer needs access to your microphone for voice search.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        // iOS
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
      // First check if Voice module is properly initialized
      if (!voiceAvailable || !Voice || typeof Voice.start !== 'function') {
        console.error('Voice module not initialized properly');
        setVoiceAvailable(false);
        Alert.alert(
          'Voice Recognition Unavailable',
          'Voice recognition is not available on this device.\n\n' +
          'Common causes:\n' +
          '• Xiaomi/Redmi phones (MIUI compatibility)\n' +
          '• Huawei phones (no Google Play Services)\n' +
          '• Custom Android ROMs\n' +
          '• React Native 0.82 new architecture limitations\n\n' +
          'Please use the text search instead.',
          [{ text: 'OK' }]
        );
        return;
      }

      const hasPermission = await requestMicrophonePermission();
      
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Microphone permission is required for voice search. Please enable it in settings.'
        );
        return;
      }

      setIsListening(true);
      await Voice.start('en-US');
    } catch (err: any) {
      console.error('Error starting voice recognition:', err);
      setIsListening(false);
      
      // Check for specific error types
      const errorMessage = err?.message || '';
      
      if (errorMessage.includes('startSpeech') || errorMessage.includes('null')) {
        setVoiceAvailable(false);
        Alert.alert(
          'Voice Recognition Not Supported',
          'Your device does not support voice recognition.\n\n' +
          'Common on Xiaomi (MIUI), Huawei, and some custom ROMs.\n\n' +
          'Please use the text search feature instead.',
          [{ text: 'OK' }]
        );
      } else if (errorMessage.includes('not available') || errorMessage.includes('SERVICE_NOT_AVAILABLE')) {
        setVoiceAvailable(false);
        Alert.alert(
          'Service Not Available',
          'Google Speech Recognition is not available on your device.\n\n' +
          'Please use the text search feature instead.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to start voice recognition. Please use text search instead.');
      }
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

  const renderPokemonItem = ({ item }: { item: Pokemon }) => (
    <PokemonCard 
      pokemon={item} 
      onPress={() => handlePokemonPress(item)}
      isDiscovered={discoveredIds.has(item.id)}
    />
  );

  const displayData = searchResults.length > 0 ? searchResults : pokemon;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pokedex</Text>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search Pokemon by name or ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => handleSearch()}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.voiceButton, 
            isListening && styles.voiceButtonActive,
            !voiceAvailable && styles.voiceButtonDisabled
          ]}
          onPress={isListening ? stopVoiceRecognition : startVoiceRecognition}
          disabled={!voiceAvailable && !isListening}
        >
          <Text style={styles.voiceButtonText}>
            {!voiceAvailable ? '🚫' : isListening ? '⏹️' : '🎤'}
          </Text>
        </TouchableOpacity>
      </View>

      {!voiceAvailable && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            ⚠️ Voice search unavailable on this device. Use text search instead.
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2c5aa0" />
          <Text>Loading Pokemon...</Text>
        </View>
      ) : (
        <FlatList
          data={displayData}
          renderItem={renderPokemonItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2c5aa0',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: '#2c5aa0',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  voiceButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    marginLeft: 10,
  },
  voiceButtonActive: {
    backgroundColor: '#dc3545',
  },
  voiceButtonDisabled: {
    backgroundColor: '#6c757d',
    opacity: 0.6,
  },
  voiceButtonText: {
    fontSize: 18,
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  warningText: {
    color: '#856404',
    fontSize: 12,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
});

export default PokedexList;
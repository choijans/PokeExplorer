import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import PokemonCard from './PokemonCard';
import { Pokemon, pokeApi } from '../services/pokeApi';

const PokedexList: React.FC = () => {
  const navigation = useNavigation();
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInitialPokemon();
  }, []);

  const loadInitialPokemon = async () => {
    console.log('Loading initial Pokemon...');
    setLoading(true);

    // Test connection first
    const connectionOk = await pokeApi.testConnection();
    if (!connectionOk) {
      Alert.alert('Connection Error', 'Cannot connect to Pokemon API. Please check your internet connection.');
      setLoading(false);
      return;
    }

    try {
      const pokemonList: Pokemon[] = [];
      for (let i = 1; i <= 20; i++) {
        console.log(`Fetching Pokemon ${i}...`);
        const poke = await pokeApi.getPokemon(i);
        pokemonList.push(poke);
      }
      console.log(`Loaded ${pokemonList.length} Pokemon`);
      setPokemon(pokemonList);
    } catch (error) {
      console.error('Error loading Pokemon:', error);
      Alert.alert('Connection Error', 'Unable to load Pokemon. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    console.log('Searching for:', searchQuery);
    setLoading(true);
    try {
      const results = await pokeApi.searchPokemon(searchQuery);
      console.log('Search results:', results);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Pokemon not found');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePokemonPress = (pokemon: Pokemon) => {
    const parentNavigation = navigation.getParent();
    if (parentNavigation) {
      parentNavigation.navigate('PokedexDetail', { pokemon });
    }
  };

  const renderPokemonItem = ({ item }: { item: Pokemon }) => (
    <PokemonCard pokemon={item} onPress={() => handlePokemonPress(item)} />
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
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

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
    marginBottom: 20,
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
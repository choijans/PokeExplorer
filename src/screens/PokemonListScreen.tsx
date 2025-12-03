import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { PokeApiService } from '../services/PokeApiService';
import { Pokemon, PokemonListItem, PokemonSpecies } from '../types/Pokemon';

const PokemonListScreen: React.FC = () => {
  const [pokemonList, setPokemonList] = useState<PokemonListItem[]>([]);
  const [filteredList, setFilteredList] = useState<PokemonListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);
  const [pokemonSpecies, setPokemonSpecies] = useState<PokemonSpecies | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadPokemon();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredList(pokemonList);
    } else {
      const filtered = pokemonList.filter(pokemon =>
        pokemon.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredList(filtered);
    }
  }, [searchQuery, pokemonList]);

  const loadPokemon = async () => {
    try {
      const response = await PokeApiService.getPokemonList(20, offset);
      setPokemonList(prev => [...prev, ...response.results]);
      setOffset(prev => prev + 20);
    } catch (error) {
      Alert.alert('Error', 'Failed to load Pokemon');
    } finally {
      setLoading(false);
    }
  };

  const loadMorePokemon = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    await loadPokemon();
    setLoadingMore(false);
  };

  const loadPokemonDetails = async (name: string) => {
    setDetailLoading(true);
    try {
      const pokemon = await PokeApiService.getPokemon(name);
      const species = await PokeApiService.getPokemonSpecies(name);
      setSelectedPokemon(pokemon);
      setPokemonSpecies(species);
    } catch (error) {
      Alert.alert('Error', 'Failed to load Pokemon details');
    } finally {
      setDetailLoading(false);
    }
  };

  const searchByType = async (type: string) => {
    setLoading(true);
    try {
      const pokemon = await PokeApiService.searchPokemonByType(type);
      const listItems = pokemon.map(p => ({ name: p.name, url: `https://pokeapi.co/api/v2/pokemon/${p.id}/` }));
      setPokemonList(listItems);
      setFilteredList(listItems);
    } catch (error) {
      Alert.alert('Error', 'Failed to search by type');
    } finally {
      setLoading(false);
    }
  };

  const renderPokemonItem = ({ item }: { item: PokemonListItem }) => (
    <TouchableOpacity style={styles.pokemonItem} onPress={() => loadPokemonDetails(item.name)}>
      <Text style={styles.pokemonName}>{item.name}</Text>
      <Text style={styles.pokemonId}>#{item.url.split('/')[6]}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (selectedPokemon) {
    return (
      <ScrollView style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => setSelectedPokemon(null)}>
          <Text style={styles.backText}>Back to List</Text>
        </TouchableOpacity>
        {detailLoading ? (
          <ActivityIndicator size="large" />
        ) : (
          <View style={styles.detailContainer}>
            <Image
              source={{ uri: selectedPokemon.sprites.other?.['official-artwork']?.front_default || selectedPokemon.sprites.front_default }}
              style={styles.pokemonImage}
            />
            <Text style={styles.pokemonTitle}>{selectedPokemon.name}</Text>
            <Text style={styles.pokemonId}>#{selectedPokemon.id}</Text>
            <View style={styles.typesContainer}>
              {selectedPokemon.types.map((type, index) => (
                <Text key={index} style={styles.typeText}>{type.type.name}</Text>
              ))}
            </View>
            <Text style={styles.sectionTitle}>Abilities</Text>
            {selectedPokemon.abilities.map((ability, index) => (
              <Text key={index} style={styles.abilityText}>{ability.ability.name}</Text>
            ))}
            <Text style={styles.sectionTitle}>Stats</Text>
            {selectedPokemon.stats.map((stat, index) => (
              <Text key={index} style={styles.statText}>{stat.stat.name}: {stat.base_stat}</Text>
            ))}
            {pokemonSpecies && (
              <>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.descriptionText}>
                  {pokemonSpecies.flavor_text_entries.find(entry => entry.language.name === 'en')?.flavor_text.replace(/\f/g, ' ')}
                </Text>
              </>
            )}
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search Pokemon by name"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <View style={styles.filterButtons}>
        <TouchableOpacity style={styles.filterButton} onPress={() => searchByType('fire')}>
          <Text style={styles.filterButtonText}>Fire</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton} onPress={() => searchByType('water')}>
          <Text style={styles.filterButtonText}>Water</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton} onPress={() => searchByType('grass')}>
          <Text style={styles.filterButtonText}>Grass</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={filteredList}
        renderItem={renderPokemonItem}
        keyExtractor={(item) => item.name}
        onEndReached={loadMorePokemon}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator /> : null}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  searchInput: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  filterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  filterButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 8,
  },
  filterButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  pokemonItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pokemonName: {
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  pokemonId: {
    fontSize: 16,
    color: '#666',
  },
  backButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  backText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  detailContainer: {
    padding: 10,
  },
  pokemonImage: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginBottom: 20,
  },
  pokemonTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'capitalize',
    marginBottom: 10,
  },
  typesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  typeText: {
    backgroundColor: '#007bff',
    color: '#fff',
    padding: 5,
    borderRadius: 5,
    marginHorizontal: 5,
    textTransform: 'capitalize',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  abilityText: {
    fontSize: 16,
    textTransform: 'capitalize',
    marginBottom: 5,
  },
  statText: {
    fontSize: 16,
    marginBottom: 5,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PokemonListScreen;
import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { pokeApi } from '../services/pokeApi';
import { RootStackParamList } from '../navigation/AppNavigator';

type PokemonDetailRouteProp = RouteProp<RootStackParamList, 'PokedexDetail'>;

interface PokemonDetailProps {
  route: PokemonDetailRouteProp;
}

const PokemonDetail: React.FC<PokemonDetailProps> = ({ route }) => {
  const { pokemon } = route.params;

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      normal: '#A8A878',
      fire: '#F08030',
      water: '#6890F0',
      electric: '#F8D030',
      grass: '#78C850',
      ice: '#98D8D8',
      fighting: '#C03028',
      poison: '#A040A0',
      ground: '#E0C068',
      flying: '#A890F0',
      psychic: '#F85888',
      bug: '#A8B820',
      rock: '#B8A038',
      ghost: '#705898',
      dragon: '#7038F8',
      dark: '#705848',
      steel: '#B8B8D0',
      fairy: '#EE99AC',
    };
    return colors[type] || '#68A090';
  };

  const getStatColor = (stat: number) => {
    if (stat >= 100) return '#4CAF50';
    if (stat >= 70) return '#FFC107';
    return '#F44336';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: pokemon.sprites.other?.['official-artwork']?.front_default || pokemon.sprites.front_default }}
          style={styles.mainImage}
          resizeMode="contain"
        />
        <Text style={styles.name}>{pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}</Text>
        <Text style={styles.id}>#{pokemon.id.toString().padStart(3, '0')}</Text>
        <View style={styles.types}>
          {pokemon.types.map((typeInfo, index) => (
            <View
              key={index}
              style={[styles.typeBadge, { backgroundColor: getTypeColor(typeInfo.type.name) }]}
            >
              <Text style={styles.typeText}>{typeInfo.type.name.toUpperCase()}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Info</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Height:</Text>
          <Text style={styles.infoValue}>{pokemon.height / 10} m</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Weight:</Text>
          <Text style={styles.infoValue}>{pokemon.weight / 10} kg</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Abilities</Text>
        {pokemon.abilities.map((ability, index) => (
          <Text key={index} style={styles.ability}>
            {ability.ability.name.charAt(0).toUpperCase() + ability.ability.name.slice(1)}
          </Text>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Base Stats</Text>
        {pokemon.stats.map((stat, index) => (
          <View key={index} style={styles.statRow}>
            <Text style={styles.statName}>{stat.stat.name.charAt(0).toUpperCase() + stat.stat.name.slice(1)}</Text>
            <View style={styles.statBar}>
              <View
                style={[
                  styles.statFill,
                  {
                    width: `${(stat.base_stat / 255) * 100}%`,
                    backgroundColor: getStatColor(stat.base_stat),
                  },
                ]}
              />
            </View>
            <Text style={styles.statValue}>{stat.base_stat}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  mainImage: {
    width: 200,
    height: 200,
    marginBottom: 16,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  id: {
    fontSize: 18,
    color: '#666',
    marginBottom: 16,
  },
  types: {
    flexDirection: 'row',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  typeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    margin: 8,
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  ability: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statName: {
    width: 80,
    fontSize: 14,
    color: '#666',
  },
  statBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#ddd',
    borderRadius: 4,
    marginHorizontal: 8,
  },
  statFill: {
    height: '100%',
    borderRadius: 4,
  },
  statValue: {
    width: 30,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  flavorText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  evolutionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  evolutionText: {
    fontSize: 16,
    color: '#333',
    marginHorizontal: 4,
  },
  arrow: {
    fontSize: 18,
    color: '#666',
    marginHorizontal: 8,
  },
  loader: {
    margin: 20,
  },
});

export default PokemonDetail;
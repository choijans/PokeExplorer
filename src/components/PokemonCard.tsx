import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Chip, Text, useTheme } from 'react-native-paper';
import { Pokemon } from '../services/pokeApi';
import { LazyImage } from './LazyImage';
import type { PokemonTheme } from '../theme';

interface PokemonCardProps {
  pokemon: Pokemon;
  onPress: () => void;
  isDiscovered?: boolean;
}

const PokemonCard: React.FC<PokemonCardProps> = ({ pokemon, onPress, isDiscovered = false }) => {
  const theme = useTheme<PokemonTheme>();

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

  return (
    <Card
      mode="elevated"
      onPress={onPress}
      style={[
        styles.card,
        { borderRadius: theme.custom.radius.lg, backgroundColor: theme.colors.surface },
        isDiscovered && { borderColor: theme.colors.primary, borderWidth: 2 },
      ]}
    >
      <Card.Content style={styles.content}>
        <View style={[styles.imageWrapper, { backgroundColor: theme.colors.primaryContainer }]}> 
          <LazyImage
            source={{
              uri:
                pokemon.sprites.other?.['official-artwork']?.front_default ||
                pokemon.sprites.front_default,
            }}
            style={styles.image}
            resizeMode="contain"
            showLoading={true}
            loadingSize="small"
            fadeInDuration={300}
          />
        </View>
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface, flexShrink: 1, minWidth: 0 }}
            >
              {pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}
            </Text>
            {isDiscovered && (
              <Chip
                compact
                icon="check"
                textStyle={{
                  color: theme.colors.onPrimary,
                  fontWeight: '600',
                }}
                style={{
                  backgroundColor: theme.colors.tertiary,
                  height: 28,
                }}
              >
                Caught
              </Chip>
            )}
          </View>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            #{pokemon.id.toString().padStart(3, '0')}
          </Text>
          <View style={styles.types}>
            {pokemon.types.map((typeInfo, index) => (
              <Chip
                key={index}
                compact
                textStyle={styles.typeText}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: getTypeColor(typeInfo.type.name),
                  },
                ]}
              >
                {typeInfo.type.name.toUpperCase()}
              </Chip>
            ))}
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 8,
    marginVertical: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  imageWrapper: {
    width: 84,
    height: 84,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: 72,
    height: 72,
  },
  info: {
    flex: 1,
    gap: 6,
  },
  types: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeChip: {
    height: 28,
  },
  typeText: {
    color: '#fff',
    fontWeight: '700',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
});

export default PokemonCard;
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import {
  Button,
  Chip,
  ProgressBar,
  Text,
  useTheme,
} from 'react-native-paper';
import { RootStackParamList } from '../navigation/AppNavigator';
import { LazyImage } from './LazyImage';
import { imageCacheService } from '../services/imageCache';
import sharingService from '../services/sharingService';
import type { PokemonTheme } from '../theme';
import Screen from './ui/Screen';
import SectionCard from './ui/SectionCard';

 type PokemonDetailRouteProp = RouteProp<RootStackParamList, 'PokedexDetail'>;

interface PokemonDetailProps {
  route: PokemonDetailRouteProp;
}

const PokemonDetail: React.FC<PokemonDetailProps> = ({ route }) => {
  const { pokemon } = route.params;
  const theme = useTheme<PokemonTheme>();

  useEffect(() => {
    const preloadSprites = async () => {
      const sprites = [
        pokemon.sprites.front_default,
        pokemon.sprites.other?.['official-artwork']?.front_default,
      ].filter(Boolean) as string[];

      await imageCacheService.prefetchPokemonSprites(pokemon.id);
      await imageCacheService.preloadImages(sprites);
    };

    preloadSprites();
  }, [pokemon]);

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
    return colors[type] || theme.colors.primary;
  };

  const getStatColor = (stat: number) => {
    if (stat >= 100) return theme.colors.primary;
    if (stat >= 70) return theme.colors.secondary;
    return theme.colors.error;
  };

  const handleShare = async () => {
    const shareData = {
      id: pokemon.id,
      name: pokemon.name,
      types: pokemon.types.map((t) => t.type.name),
      height: pokemon.height,
      weight: pokemon.weight,
      abilities: pokemon.abilities.map((a) => a.ability.name),
      stats: pokemon.stats.map((s) => ({
        name: s.stat.name,
        base_stat: s.base_stat,
      })),
      imageUrl: pokemon.sprites.other?.['official-artwork']?.front_default || pokemon.sprites.front_default,
    };

    await sharingService.sharePokemonDetails(shareData);
  };

  return (
    <Screen scrollable>
      <View style={{ gap: theme.custom.spacing.lg }}>
        <LinearGradient
          colors={theme.custom.gradients.card}
          style={[styles.hero, { borderRadius: theme.custom.radius.lg }]}
        >
          <View style={styles.heroContent}>
            <LazyImage
              source={{
                uri: pokemon.sprites.other?.['official-artwork']?.front_default ||
                  pokemon.sprites.front_default,
              }}
              style={styles.mainImage}
              resizeMode="contain"
              showLoading
              loadingSize="large"
              fadeInDuration={400}
            />
            <View style={styles.heroText}>
              <Text variant="headlineMedium" style={{ color: theme.colors.onSurface, textTransform: 'capitalize' }}>
                {pokemon.name}
              </Text>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                #{pokemon.id.toString().padStart(3, '0')}
              </Text>
              <View style={styles.typeRow}>
                {pokemon.types.map((typeInfo, index) => (
                  <Chip
                    key={index}
                    compact
                    textStyle={styles.typeText}
                    style={[styles.typeChip, { backgroundColor: getTypeColor(typeInfo.type.name) }]}
                  >
                    {typeInfo.type.name.toUpperCase()}
                  </Chip>
                ))}
              </View>
              <Button
                mode="contained"
                icon="share-variant"
                onPress={handleShare}
                style={styles.shareButton}
              >
                Share Pokémon
              </Button>
            </View>
          </View>
        </LinearGradient>

        <SectionCard title="Basic Info">
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                Height
              </Text>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                {pokemon.height / 10} m
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                Weight
              </Text>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                {pokemon.weight / 10} kg
              </Text>
            </View>
          </View>
        </SectionCard>

        <SectionCard title="Abilities">
          <View style={{ gap: theme.custom.spacing.xs }}>
            {pokemon.abilities.map((ability, index) => (
              <Text key={index} variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                • {ability.ability.name.charAt(0).toUpperCase() + ability.ability.name.slice(1)}
              </Text>
            ))}
          </View>
        </SectionCard>

        <SectionCard title="Base Stats">
          <View style={{ gap: theme.custom.spacing.sm }}>
            {pokemon.stats.map((stat, index) => (
              <View key={index} style={styles.statRow}>
                <View style={styles.statLabel}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                    {stat.stat.name.charAt(0).toUpperCase() + stat.stat.name.slice(1)}
                  </Text>
                  <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {stat.base_stat}
                  </Text>
                </View>
                <ProgressBar
                  progress={Math.min(stat.base_stat / 255, 1)}
                  color={getStatColor(stat.base_stat)}
                  style={{ borderRadius: theme.custom.radius.sm }}
                />
              </View>
            ))}
          </View>
        </SectionCard>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: {
    padding: 20,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  mainImage: {
    width: 180,
    height: 180,
  },
  heroText: {
    flex: 1,
    gap: 12,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    height: 28,
  },
  typeText: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  shareButton: {
    alignSelf: 'flex-start',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 24,
  },
  infoItem: {
    flex: 1,
  },
  statRow: {
    gap: 12,
  },
  statLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default PokemonDetail;
import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { RouteProp } from '@react-navigation/native';
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
import { chipStyles } from '../styles/chipStyles';

 type PokemonDetailRouteProp = RouteProp<RootStackParamList, 'PokedexDetail'>;

interface PokemonDetailProps {
  route: PokemonDetailRouteProp;
}

const PokemonDetail: React.FC<PokemonDetailProps> = ({ route }) => {
  const { pokemon } = route.params;
  const theme = useTheme<PokemonTheme>();

  const [showAnimated, setShowAnimated] = useState(false);

  const staticImage = useMemo(
    () =>
      pokemon.sprites.other?.['official-artwork']?.front_default ??
      pokemon.sprites.front_default,
    [pokemon],
  );

  const animatedImage = useMemo(() => {
    const spriteVersions = (pokemon as any).sprites?.versions;
    return (
      spriteVersions?.['generation-v']?.['black-white']?.animated?.front_default ?? null
    );
  }, [pokemon]);

  const canToggleImage = Boolean(animatedImage);
  const currentImage = canToggleImage && showAnimated && animatedImage ? animatedImage : staticImage;

  useEffect(() => {
    setShowAnimated(false);
  }, [pokemon.id]);

  useEffect(() => {
    const preloadSprites = async () => {
      await imageCacheService.prefetchPokemonSprites(pokemon.id);

      const sprites = [staticImage, animatedImage].filter(Boolean) as string[];
      if (sprites.length > 0) {
        await imageCacheService.preloadImages(sprites);
      }
    };

    preloadSprites();
  }, [pokemon, staticImage, animatedImage]);

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

  const toggleImageMode = () => {
    if (!canToggleImage) {
      return;
    }

    setShowAnimated((prev) => !prev);
  };

  return (
    <Screen scrollable>
      <View style={{ gap: theme.custom.spacing.lg }}>
        <View
          style={[
            styles.hero,
            {
              borderRadius: theme.custom.radius.lg,
              backgroundColor: theme.colors.surface,
              shadowColor: theme.colors.outlineVariant,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={canToggleImage ? 0.85 : 1}
            onPress={toggleImageMode}
            disabled={!canToggleImage}
            style={[
              styles.imageContainer,
              {
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: theme.custom.radius.lg,
              },
            ]}
          >
            <LazyImage
              key={showAnimated && canToggleImage ? 'animated' : 'static'}
              source={{ uri: currentImage }}
              style={styles.mainImage}
              resizeMode="contain"
              showLoading
              loadingSize="large"
              fadeInDuration={300}
            />
            {canToggleImage && (
              <View
                style={[
                  styles.imageBadge,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
              >
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {showAnimated ? 'Animated sprite' : 'Official artwork'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.heroMeta}>
            <Text
              variant="headlineMedium"
              style={{
                color: theme.colors.onSurface,
                textTransform: 'capitalize',
                textAlign: 'center',
              }}
            >
              {pokemon.name}
            </Text>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              #{pokemon.id.toString().padStart(3, '0')}
            </Text>
          </View>

          <View style={styles.typeRow}>
            {pokemon.types.map((typeInfo, index) => (
              <Chip
                key={index}
                textStyle={styles.typeText}
                style={[chipStyles.base, { backgroundColor: getTypeColor(typeInfo.type.name) }]}
              >
                {typeInfo.type.name.toUpperCase()}
              </Chip>
            ))}
          </View>

          <View style={styles.metricRow}>
            <View
              style={[styles.metricCard, { backgroundColor: theme.colors.surfaceVariant }]}
            >
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Height
              </Text>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                {(pokemon.height / 10).toFixed(1)} m
              </Text>
            </View>
            <View
              style={[styles.metricCard, { backgroundColor: theme.colors.surfaceVariant }]}
            >
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Weight
              </Text>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                {(pokemon.weight / 10).toFixed(1)} kg
              </Text>
            </View>
          </View>

          {canToggleImage && (
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}
            >
              Tap the image to switch to {showAnimated ? 'official artwork' : 'animated sprite'}.
            </Text>
          )}

          <Button
            mode="contained-tonal"
            icon="share-variant"
            onPress={handleShare}
            style={styles.shareButton}
          >
            Share Pokémon
          </Button>
        </View>

        <SectionCard
          title="Abilities"
          style={[styles.section, { backgroundColor: theme.colors.surface }]}
          contentStyle={styles.sectionContent}
        >
          <View style={styles.abilityList}>
            {pokemon.abilities.map((ability, index) => (
              <Chip
                key={index}
                style={[chipStyles.base, { backgroundColor: theme.colors.surfaceVariant }]}
                textStyle={{ color: theme.colors.onSurface }}
              >
                {ability.ability.name.charAt(0).toUpperCase() + ability.ability.name.slice(1)}
              </Chip>
            ))}
          </View>
        </SectionCard>

        <SectionCard
          title="Base Stats"
          style={[styles.section, { backgroundColor: theme.colors.surface }]}
          contentStyle={styles.sectionContent}
        >
          <View style={styles.statList}>
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
                  style={{ borderRadius: theme.custom.radius.sm, height: 6 }}
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
    padding: 24,
    gap: 20,
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  mainImage: {
    width: 220,
    height: 220,
  },
  imageBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroMeta: {
    gap: 4,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  typeText: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  metricCard: {
    minWidth: 120,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 4,
  },
  shareButton: {
    alignSelf: 'center',
  },
  section: {
    borderRadius: 20,
  },
  sectionContent: {
    gap: 12,
    paddingVertical: 16,
  },
  abilityList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statList: {
    gap: 16,
  },
  statRow: {
    gap: 8,
  },
  statLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default PokemonDetail;
import React, { useState, useEffect } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import Screen from '../components/ui/Screen';
import SectionCard from '../components/ui/SectionCard';
import { useAuth } from '../contexts/AuthContext';
import { discoveryService } from '../services/discoveryService';
import type { PokemonTheme } from '../theme';

const UserProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const [discoveryCount, setDiscoveryCount] = useState(0);
  const theme = useTheme<PokemonTheme>();

  useEffect(() => {
    if (user) {
      loadDiscoveredPokemon();
    }
  }, [user]);

  const loadDiscoveredPokemon = async () => {
    try {
      const count = await discoveryService.getDiscoveryCount();
      setDiscoveryCount(count);
    } catch (error) {
      console.error('Error loading discovery count:', error);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        onPress: async () => {
          try {
            await signOut();
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onSurface }}>
          Trainer Profile
        </Text>
        <Text
          variant="bodyLarge"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          Manage your account and track your exploration progress.
        </Text>

        <SectionCard title="Account">
          <View style={styles.sectionContent}>
            <Text
              variant="labelLarge"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Email
            </Text>
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface }}
            >
              {user?.email || 'Not available'}
            </Text>
          </View>
        </SectionCard>

        <SectionCard
          title="Discoveries"
          subtitle="Total Pokémon caught across all hunts"
        >
          <View style={styles.statContainer}>
            <Text
              variant="displaySmall"
              style={{ color: theme.colors.primary }}
            >
              {discoveryCount}
            </Text>
            <Text
              variant="bodyLarge"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Pokémon discovered
            </Text>
          </View>
        </SectionCard>

        <Button
          mode="contained-tonal"
          icon="logout"
          onPress={handleSignOut}
        >
          Sign Out
        </Button>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
  },
  sectionContent: {
    gap: 4,
  },
  statContainer: {
    alignItems: 'center',
    gap: 4,
  },
});

export default UserProfileScreen;
import React, { useState, useEffect } from 'react';
import { Alert, StyleSheet, View, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Text, useTheme } from 'react-native-paper';
import Screen from '../components/ui/Screen';
import SectionCard from '../components/ui/SectionCard';
import { useAuth } from '../contexts/AuthContext';
import { discoveryService } from '../services/discoveryService';
import { firebaseDiscoveryService } from '../services/firebaseDiscoveryService';
import { inventoryService, InventoryItem } from '../services/inventoryService';
import { firebaseInventoryService } from '../services/firebaseInventoryService';
import { currencyService } from '../services/currencyService';
import { levelService, LevelData } from '../services/levelService';
import type { PokemonTheme } from '../theme';

const UserProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const [discoveryCount, setDiscoveryCount] = useState(0);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [coins, setCoins] = useState(0);
  const [levelData, setLevelData] = useState<LevelData>({ level: 1, xp: 0, totalXP: 0 });
  const theme = useTheme<PokemonTheme>();

  useEffect(() => {
    if (user) {
      loadDiscoveredPokemon();
      loadInventory();
      loadCoins();
      loadLevel();
    }
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadDiscoveredPokemon();
        loadInventory();
        loadCoins();
        loadLevel();
      }
    }, [user])
  );

  const loadDiscoveredPokemon = async () => {
    try {
      if (user) {
        // For logged-in users, get count from Firebase
        const captured = await firebaseDiscoveryService.getCapturedPokemon(user.uid);
        setDiscoveryCount(captured.length);
      } else {
        // For non-logged-in users, get count from local storage
        const count = await discoveryService.getDiscoveryCount();
        setDiscoveryCount(count);
      }
    } catch (error) {
      console.error('Error loading discovery count:', error);
    }
  };

  const loadInventory = async () => {
    try {
      const inv = user ? await firebaseInventoryService.getInventory(user.uid) : await inventoryService.getInventory();
      setInventory(inv);
    } catch (error) {
      console.error('Error loading inventory:', error);
    }
  };

  const loadCoins = async () => {
    try {
      if (user) {
        const balance = await currencyService.getBalance(user.uid);
        setCoins(balance);
      }
    } catch (error) {
      console.error('Error loading coins:', error);
    }
  };

  const loadLevel = async () => {
    try {
      if (user) {
        const data = await levelService.getLevelData(user.uid);
        setLevelData(data);
      }
    } catch (error) {
      console.error('Error loading level:', error);
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
      <ScrollView style={styles.container}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onSurface }}>
          Trainer Profile
        </Text>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
          Manage your account and track your exploration progress.
        </Text>

        <SectionCard title="Account">
          <View style={styles.sectionContent}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>Email</Text>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>{user?.email || 'Not available'}</Text>
          </View>
          <View style={[styles.sectionContent, { marginTop: 12 }]}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>Level</Text>
            <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>⭐ Level {levelData.level}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              {levelData.xp} / {levelService.getXPForNextLevel(levelData.level)} XP
            </Text>
          </View>
          <View style={[styles.sectionContent, { marginTop: 12 }]}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>Coins</Text>
            <Text variant="titleLarge" style={{ color: '#FFD700', fontWeight: 'bold' }}>💰 {coins.toLocaleString()}</Text>
          </View>
        </SectionCard>

        <SectionCard title="Discoveries" subtitle="Total Pokémon caught across all hunts">
          <View style={styles.statContainer}>
            <Text variant="displaySmall" style={{ color: theme.colors.primary }}>{discoveryCount}</Text>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>Pokémon discovered</Text>
          </View>
        </SectionCard>

        <SectionCard title="Inventory" subtitle="Your Poké Balls and Items">
          <View style={styles.inventoryGrid}>
            {inventory.map(item => (
              <View key={item.id} style={styles.inventoryItem}>
                <Text style={styles.inventoryIcon}>{item.icon}</Text>
                <Text style={[styles.inventoryName, { color: theme.colors.onSurface }]}>{item.name}</Text>
                <Text style={[styles.inventoryCount, { color: theme.colors.primary }]}>x{item.count}</Text>
              </View>
            ))}
          </View>
        </SectionCard>

        <Button mode="contained-tonal" icon="logout" onPress={handleSignOut}>Sign Out</Button>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, gap: 16 },
  sectionContent: { gap: 4 },
  statContainer: { alignItems: 'center', gap: 4 },
  inventoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  inventoryItem: { width: '30%', backgroundColor: 'rgba(0,0,0,0.05)', padding: 12, borderRadius: 12, alignItems: 'center' },
  inventoryIcon: { fontSize: 36, marginBottom: 6 },
  inventoryName: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  inventoryCount: { fontSize: 14, fontWeight: 'bold', marginTop: 4 },
});

export default UserProfileScreen;
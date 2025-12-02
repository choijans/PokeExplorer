import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Pokemon {
  id: number;
  name: string;
  discoveredAt: string;
}

const UserProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const [discoveredPokemon, setDiscoveredPokemon] = useState<Pokemon[]>([]);

  useEffect(() => {
    if (user) {
      loadDiscoveredPokemon();
    }
  }, [user]);

  const loadDiscoveredPokemon = async () => {
    try {
      const stored = await AsyncStorage.getItem('discoveredPokemon');
      if (stored) {
        setDiscoveredPokemon(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading discovered Pokémon:', error);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
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
        },
      ]
    );
  };

  const renderPokemon = ({ item }: { item: Pokemon }) => (
    <View style={styles.pokemonItem}>
      <Text style={styles.pokemonName}>{item.name}</Text>
      <Text style={styles.discoveredAt}>Discovered: {new Date(item.discoveredAt).toLocaleDateString()}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.email}>Email: {user?.email}</Text>
      <Text style={styles.sectionTitle}>Discovered Pokémon ({discoveredPokemon.length})</Text>
      <FlatList
        data={discoveredPokemon}
        renderItem={renderPokemon}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
      />
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  email: {
    fontSize: 16,
    marginBottom: 20,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  list: {
    flex: 1,
  },
  pokemonItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pokemonName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  discoveredAt: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  signOutButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default UserProfileScreen;
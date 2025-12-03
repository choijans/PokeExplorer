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
import { discoveryService } from '../services/discoveryService';



const UserProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const [discoveryCount, setDiscoveryCount] = useState(0);

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



  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.email}>Email: {user?.email}</Text>
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{discoveryCount}</Text>
          <Text style={styles.statLabel}>Pokemon Discovered</Text>
        </View>
      </View>
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
  statsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF0000',
  },
  statLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
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
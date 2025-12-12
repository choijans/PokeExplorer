import database from '@react-native-firebase/database';
import { Pokemon } from './pokeApi';

export interface CapturedPokemon {
  id: number;
  name: string;
  count: number;
  firstCapturedAt: string;
  lastCapturedAt: string;
  highestCp?: number;
  highestLevel?: number;
  captures: {
    capturedAt: string;
    location?: { latitude: number; longitude: number };
    biome?: string;
    cp: number;
    level: number;
  }[];
}

class FirebaseDiscoveryService {
  async getCapturedPokemon(userId: string): Promise<CapturedPokemon[]> {
    try {
      const snapshot = await database().ref(`users/${userId}/collection`).once('value');
      const data = snapshot.val();
      return data ? Object.values(data) : [];
    } catch (error) {
      console.error('Error loading captured Pokemon:', error);
      return [];
    }
  }

  async addCapturedPokemon(userId: string, pokemon: Pokemon, location?: { latitude: number; longitude: number }, biome?: string): Promise<void> {
    try {
      const cp = Math.floor(Math.random() * 1000) + 100;
      const level = Math.floor(Math.random() * 40) + 1;
      const now = new Date().toISOString();
      
      const collectionRef = database().ref(`users/${userId}/collection/${pokemon.id}`);
      const snapshot = await collectionRef.once('value');
      
      if (snapshot.exists()) {
        // Pokemon already exists, increment count
        const existing = snapshot.val();
        await collectionRef.update({
          count: (existing.count || 1) + 1,
          lastCapturedAt: now,
          highestCp: Math.max(existing.highestCp || 0, cp),
          highestLevel: Math.max(existing.highestLevel || 0, level),
        });
        
        // Add to captures history
        await database().ref(`users/${userId}/collection/${pokemon.id}/captures`).push({
          capturedAt: now,
          location,
          biome,
          cp,
          level,
        });
      } else {
        // First time catching this Pokemon
        await collectionRef.set({
          id: pokemon.id,
          name: pokemon.name,
          count: 1,
          firstCapturedAt: now,
          lastCapturedAt: now,
          highestCp: cp,
          highestLevel: level,
          captures: {
            [database().ref().push().key!]: {
              capturedAt: now,
              location,
              biome,
              cp,
              level,
            },
          },
        });
      }
      
      // Update stats
      const statsRef = database().ref(`users/${userId}/stats`);
      await statsRef.transaction((stats) => {
        const isNew = !snapshot.exists();
        if (!stats) {
          return { totalCaptured: 1, uniqueCaptured: 1 };
        }
        return {
          ...stats,
          totalCaptured: (stats.totalCaptured || 0) + 1,
          uniqueCaptured: isNew ? (stats.uniqueCaptured || 0) + 1 : stats.uniqueCaptured,
        };
      });
    } catch (error) {
      console.error('Error saving captured Pokemon:', error);
    }
  }

  async getPokemonCount(userId: string, pokemonId: number): Promise<number> {
    try {
      const snapshot = await database().ref(`users/${userId}/collection/${pokemonId}/count`).once('value');
      return snapshot.val() || 0;
    } catch (error) {
      console.error('Error getting Pokemon count:', error);
      return 0;
    }
  }

  async getStats(userId: string): Promise<{ totalCaptured: number; uniqueCaptured: number }> {
    try {
      const snapshot = await database().ref(`users/${userId}/stats`).once('value');
      return snapshot.val() || { totalCaptured: 0, uniqueCaptured: 0 };
    } catch (error) {
      console.error('Error getting stats:', error);
      return { totalCaptured: 0, uniqueCaptured: 0 };
    }
  }
}

export const firebaseDiscoveryService = new FirebaseDiscoveryService();

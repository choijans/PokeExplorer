import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pokemon } from './pokeApi';

export interface DiscoveredPokemon {
  id: number;
  name: string;
  count: number;
  firstDiscoveredAt: string;
  lastDiscoveredAt: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  biome?: string;
}

class DiscoveryService {
  private readonly STORAGE_KEY = 'discoveredPokemon';

  async getDiscoveredPokemon(): Promise<DiscoveredPokemon[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading discovered Pokemon:', error);
      return [];
    }
  }

  async addDiscoveredPokemon(pokemon: Pokemon, location?: { latitude: number; longitude: number }, biome?: string): Promise<void> {
    try {
      const discovered = await this.getDiscoveredPokemon();
      const existing = discovered.find(p => p.id === pokemon.id);
      const now = new Date().toISOString();
      
      if (existing) {
        // Increment count for existing Pokemon
        existing.count = (existing.count || 1) + 1;
        existing.lastDiscoveredAt = now;
        if (location) existing.location = location;
        if (biome) existing.biome = biome;
      } else {
        // First time discovering this Pokemon
        const newDiscovery: DiscoveredPokemon = {
          id: pokemon.id,
          name: pokemon.name,
          count: 1,
          firstDiscoveredAt: now,
          lastDiscoveredAt: now,
          location,
          biome,
        };
        discovered.push(newDiscovery);
      }

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(discovered));
    } catch (error) {
      console.error('Error saving discovered Pokemon:', error);
    }
  }

  async isDiscovered(pokemonId: number): Promise<boolean> {
    const discovered = await this.getDiscoveredPokemon();
    return discovered.some(p => p.id === pokemonId);
  }

  async getDiscoveryCount(): Promise<number> {
    const discovered = await this.getDiscoveredPokemon();
    return discovered.length;
  }

  async clearDiscoveries(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing discoveries:', error);
    }
  }
}

export const discoveryService = new DiscoveryService();
import database from '@react-native-firebase/database';
import { Pokemon } from './pokeApi';

export interface PokemonInstance {
  id: string;
  pokemonId: number;
  name: string;
  weight: number;
  rarity: string;
  capturedAt: number;
  sprite: string;
}

class PokemonInstanceService {
  async saveCaughtPokemon(userId: string, pokemon: Pokemon, rarity: string): Promise<PokemonInstance> {
    const baseWeight = pokemon.weight / 10;
    const variance = 0.8 + Math.random() * 0.4;
    const actualWeight = parseFloat((baseWeight * variance).toFixed(2));
    
    const instance: Omit<PokemonInstance, 'id'> = {
      pokemonId: pokemon.id,
      name: pokemon.name,
      weight: actualWeight,
      rarity,
      capturedAt: Date.now(),
      sprite: pokemon.sprites.other?.['official-artwork']?.front_default || pokemon.sprites.front_default,
    };
    
    const ref = database().ref(`users/${userId}/caughtInstances`).push();
    await ref.set(instance);
    
    await this.incrementCatchCount(userId, pokemon.id);
    
    return { id: ref.key!, ...instance };
  }

  async getCaughtInstances(userId: string): Promise<PokemonInstance[]> {
    const snapshot = await database().ref(`users/${userId}/caughtInstances`).once('value');
    const data = snapshot.val();
    
    if (!data) return [];
    
    return Object.entries(data).map(([id, instance]: [string, any]) => ({
      id,
      ...instance,
    }));
  }

  async getInstancesByPokemon(userId: string, pokemonId: number): Promise<PokemonInstance[]> {
    const instances = await this.getCaughtInstances(userId);
    return instances.filter(i => i.pokemonId === pokemonId);
  }

  async deleteInstance(userId: string, instanceId: string): Promise<void> {
    await database().ref(`users/${userId}/caughtInstances/${instanceId}`).remove();
  }

  async incrementCatchCount(userId: string, pokemonId: number): Promise<void> {
    const ref = database().ref(`users/${userId}/discoveries/${pokemonId}/count`);
    await ref.transaction((current) => (current || 0) + 1);
  }

  async getCatchCount(userId: string, pokemonId: number): Promise<number> {
    const snapshot = await database().ref(`users/${userId}/discoveries/${pokemonId}/count`).once('value');
    return snapshot.val() || 0;
  }

  getTotalWeight(instances: PokemonInstance[]): number {
    return parseFloat(instances.reduce((sum, i) => sum + i.weight, 0).toFixed(2));
  }
}

export const pokemonInstanceService = new PokemonInstanceService();

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pokemon, PokemonSpecies, EvolutionChain, PokemonListResponse } from '../types/Pokemon';

const BASE_URL = 'https://pokeapi.co/api/v2';

export class PokeApiService {
  static async getPokemonList(limit: number = 20, offset: number = 0): Promise<PokemonListResponse> {
    const cacheKey = `pokemon_list_${limit}_${offset}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    const response = await axios.get(`${BASE_URL}/pokemon?limit=${limit}&offset=${offset}`);
    await AsyncStorage.setItem(cacheKey, JSON.stringify(response.data));
    return response.data;
  }

  static async getPokemon(nameOrId: string | number): Promise<Pokemon> {
    const cacheKey = `pokemon_${nameOrId}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    const response = await axios.get(`${BASE_URL}/pokemon/${nameOrId}`);
    await AsyncStorage.setItem(cacheKey, JSON.stringify(response.data));
    return response.data;
  }

  static async getPokemonSpecies(nameOrId: string | number): Promise<PokemonSpecies> {
    const response = await axios.get(`${BASE_URL}/pokemon-species/${nameOrId}`);
    return response.data;
  }

  static async getEvolutionChain(id: number): Promise<EvolutionChain> {
    const response = await axios.get(`${BASE_URL}/evolution-chain/${id}`);
    return response.data;
  }

  static async searchPokemonByType(type: string): Promise<Pokemon[]> {
    const response = await axios.get(`${BASE_URL}/type/${type}`);
    const pokemonList = response.data.pokemon.map((p: any) => p.pokemon);
    // Fetch full details for each pokemon (limit to first 20 for performance)
    const pokemonDetails = await Promise.all(
      pokemonList.slice(0, 20).map(async (p: any) => {
        try {
          return await this.getPokemon(p.name);
        } catch {
          return null;
        }
      })
    );
    return pokemonDetails.filter(p => p !== null);
  }
}
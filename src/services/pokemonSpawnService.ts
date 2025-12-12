import AsyncStorage from '@react-native-async-storage/async-storage';
import { locationService, PokemonEncounter, Location } from './locationService';

type SpawnCallback = (pokemon: PokemonEncounter[]) => void;
type NotificationCallback = (pokemon: PokemonEncounter) => void;

class PokemonSpawnService {
  private pokemon: PokemonEncounter[] = [];
  private spawnTimes: Map<string, number> = new Map();
  private subscribers: Set<SpawnCallback> = new Set();
  private notificationSubscribers: Set<NotificationCallback> = new Set();
  private spawnInterval: any = null;
  private despawnInterval: any = null;
  private currentLocation: Location | null = null;
  private readonly STORAGE_KEY = 'activeSpawns';

  subscribe(callback: SpawnCallback): () => void {
    this.subscribers.add(callback);
    callback(this.pokemon);
    return () => this.subscribers.delete(callback);
  }

  subscribeToNotifications(callback: NotificationCallback): () => void {
    this.notificationSubscribers.add(callback);
    return () => this.notificationSubscribers.delete(callback);
  }

  private notify() {
    this.subscribers.forEach(cb => cb([...this.pokemon]));
  }

  private notifyNewSpawn(pokemon: PokemonEncounter) {
    this.notificationSubscribers.forEach(cb => cb(pokemon));
  }

  private async saveToStorage() {
    try {
      const data = {
        pokemon: this.pokemon,
        spawnTimes: Array.from(this.spawnTimes.entries()),
      };
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[SPAWN SERVICE] Failed to save:', error);
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const now = Date.now();
        this.pokemon = data.pokemon.filter((p: PokemonEncounter) => {
          const key = `${p.location.latitude.toFixed(6)}-${p.location.longitude.toFixed(6)}`;
          const despawnTime = data.spawnTimes.find((e: [string, number]) => e[0] === key)?.[1];
          return despawnTime && despawnTime > now;
        });
        data.spawnTimes.forEach(([key, time]: [string, number]) => {
          if (time > now) this.spawnTimes.set(key, time);
        });
        console.log('[SPAWN SERVICE] Loaded', this.pokemon.length, 'spawns from storage');
      }
    } catch (error) {
      console.error('[SPAWN SERVICE] Failed to load:', error);
    }
  }

  async start(location: Location) {
    this.currentLocation = location;
    
    // Load persisted spawns
    await this.loadFromStorage();
    
    // Initial spawn if no persisted data
    if (this.pokemon.length === 0) {
      const initial = locationService.generatePokemonEncounters(location);
      const now = Date.now();
      initial.forEach(p => {
        const key = `${p.location.latitude.toFixed(6)}-${p.location.longitude.toFixed(6)}`;
        this.spawnTimes.set(key, now + (10 * 60 * 1000));
      });
      this.pokemon = initial;
      await this.saveToStorage();
    }
    this.notify();

    // Spawn new Pokemon every 30 seconds
    this.spawnInterval = setInterval(async () => {
      if (this.currentLocation) {
        const newEncounter = locationService.generatePokemonEncounters(this.currentLocation)[0];
        if (newEncounter) {
          const key = `${newEncounter.location.latitude.toFixed(6)}-${newEncounter.location.longitude.toFixed(6)}`;
          this.spawnTimes.set(key, Date.now() + (10 * 60 * 1000));
          this.pokemon.push(newEncounter);
          await this.saveToStorage();
          this.notify();
          this.notifyNewSpawn(newEncounter);
          console.log('[SPAWN SERVICE] New Pokemon spawned:', newEncounter.id, newEncounter.rarity);
        }
      }
    }, 30000);

    // Check despawn every 30 seconds
    this.despawnInterval = setInterval(async () => {
      const now = Date.now();
      const before = this.pokemon.length;
      this.pokemon = this.pokemon.filter(p => {
        const key = `${p.location.latitude.toFixed(6)}-${p.location.longitude.toFixed(6)}`;
        const despawnTime = this.spawnTimes.get(key);
        if (despawnTime && despawnTime <= now) {
          this.spawnTimes.delete(key);
          console.log('[SPAWN SERVICE] Pokemon despawned:', p.id);
          return false;
        }
        return true;
      });
      if (before !== this.pokemon.length) {
        await this.saveToStorage();
        this.notify();
      }
    }, 30000);
  }

  stop() {
    if (this.spawnInterval) clearInterval(this.spawnInterval);
    if (this.despawnInterval) clearInterval(this.despawnInterval);
    this.spawnInterval = null;
    this.despawnInterval = null;
  }

  updateLocation(location: Location) {
    this.currentLocation = location;
  }

  async removePokemon(pokemon: PokemonEncounter) {
    const key = `${pokemon.location.latitude.toFixed(6)}-${pokemon.location.longitude.toFixed(6)}`;
    this.spawnTimes.delete(key);
    this.pokemon = this.pokemon.filter(p => {
      const pKey = `${p.location.latitude.toFixed(6)}-${p.location.longitude.toFixed(6)}`;
      return pKey !== key;
    });
    await this.saveToStorage();
    this.notify();
  }

  getTimeRemaining(pokemon: PokemonEncounter): number {
    const key = `${pokemon.location.latitude.toFixed(6)}-${pokemon.location.longitude.toFixed(6)}`;
    const despawnTime = this.spawnTimes.get(key);
    if (!despawnTime) return 0;
    return Math.max(0, Math.floor((despawnTime - Date.now()) / 1000));
  }
}

export const pokemonSpawnService = new PokemonSpawnService();

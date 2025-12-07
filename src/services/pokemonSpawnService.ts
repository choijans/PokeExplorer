import { locationService, PokemonEncounter, Location } from './locationService';

type SpawnCallback = (pokemon: PokemonEncounter[]) => void;

class PokemonSpawnService {
  private pokemon: PokemonEncounter[] = [];
  private spawnTimes: Map<string, number> = new Map();
  private subscribers: Set<SpawnCallback> = new Set();
  private spawnInterval: any = null;
  private despawnInterval: any = null;
  private currentLocation: Location | null = null;

  subscribe(callback: SpawnCallback): () => void {
    this.subscribers.add(callback);
    callback(this.pokemon);
    return () => this.subscribers.delete(callback);
  }

  private notify() {
    this.subscribers.forEach(cb => cb([...this.pokemon]));
  }

  start(location: Location) {
    this.currentLocation = location;
    
    // Initial spawn
    const initial = locationService.generatePokemonEncounters(location);
    const now = Date.now();
    initial.forEach(p => {
      const key = `${p.location.latitude.toFixed(6)}-${p.location.longitude.toFixed(6)}`;
      this.spawnTimes.set(key, now + (10 * 60 * 1000));
    });
    this.pokemon = initial;
    this.notify();

    // Spawn new Pokemon every 30 seconds
    this.spawnInterval = setInterval(() => {
      if (this.currentLocation) {
        const newEncounter = locationService.generatePokemonEncounters(this.currentLocation)[0];
        if (newEncounter) {
          const key = `${newEncounter.location.latitude.toFixed(6)}-${newEncounter.location.longitude.toFixed(6)}`;
          this.spawnTimes.set(key, Date.now() + (10 * 60 * 1000));
          this.pokemon.push(newEncounter);
          this.notify();
          console.log('[SPAWN SERVICE] New Pokemon spawned:', newEncounter.id);
        }
      }
    }, 30000);

    // Check despawn every 30 seconds
    this.despawnInterval = setInterval(() => {
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

  removePokemon(pokemon: PokemonEncounter) {
    const key = `${pokemon.location.latitude.toFixed(6)}-${pokemon.location.longitude.toFixed(6)}`;
    this.spawnTimes.delete(key);
    this.pokemon = this.pokemon.filter(p => {
      const pKey = `${p.location.latitude.toFixed(6)}-${p.location.longitude.toFixed(6)}`;
      return pKey !== key;
    });
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

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CatchHistoryEntry {
  pokemonId: number;
  pokemonName: string;
  timestamp: number;
  result: 'caught' | 'fled';
  location: { latitude: number; longitude: number };
  biome: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  ballUsed?: string;
  xpGained?: number;
  candyGained?: number;
}

class CatchHistoryService {
  private readonly STORAGE_KEY = 'catchHistory';

  async addEntry(entry: CatchHistoryEntry): Promise<void> {
    try {
      const history = await this.getHistory();
      history.unshift(entry);
      if (history.length > 500) history.splice(500);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('[CATCH HISTORY] Failed to save:', error);
    }
  }

  async getHistory(): Promise<CatchHistoryEntry[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[CATCH HISTORY] Failed to load:', error);
      return [];
    }
  }

  async getStats() {
    const history = await this.getHistory();
    const caught = history.filter(e => e.result === 'caught').length;
    const fled = history.filter(e => e.result === 'fled').length;
    const byRarity = {
      common: history.filter(e => e.rarity === 'common' && e.result === 'caught').length,
      uncommon: history.filter(e => e.rarity === 'uncommon' && e.result === 'caught').length,
      rare: history.filter(e => e.rarity === 'rare' && e.result === 'caught').length,
      legendary: history.filter(e => e.rarity === 'legendary' && e.result === 'caught').length,
    };
    return { caught, fled, total: caught + fled, byRarity };
  }
}

export const catchHistoryService = new CatchHistoryService();

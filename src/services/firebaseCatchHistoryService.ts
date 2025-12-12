import database from '@react-native-firebase/database';

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

class FirebaseCatchHistoryService {
  async addEntry(userId: string, entry: CatchHistoryEntry): Promise<void> {
    try {
      const ref = database().ref(`users/${userId}/catchHistory`).push();
      await ref.set(entry);
    } catch (error) {
      console.error('[FIREBASE CATCH HISTORY] Failed to save:', error);
    }
  }

  subscribeToHistory(userId: string, callback: (history: CatchHistoryEntry[]) => void): () => void {
    const ref = database().ref(`users/${userId}/catchHistory`).orderByChild('timestamp').limitToLast(100);
    
    const listener = ref.on('value', (snapshot) => {
      const data = snapshot.val();
      const history: CatchHistoryEntry[] = data ? Object.values(data).reverse() : [];
      callback(history);
    });

    return () => ref.off('value', listener);
  }

  async getStats(userId: string) {
    try {
      const snapshot = await database().ref(`users/${userId}/catchHistory`).once('value');
      const data = snapshot.val();
      const history: CatchHistoryEntry[] = data ? Object.values(data) : [];
      
      const caught = history.filter(e => e.result === 'caught').length;
      const fled = history.filter(e => e.result === 'fled').length;
      const byRarity = {
        common: history.filter(e => e.rarity === 'common' && e.result === 'caught').length,
        uncommon: history.filter(e => e.rarity === 'uncommon' && e.result === 'caught').length,
        rare: history.filter(e => e.rarity === 'rare' && e.result === 'caught').length,
        legendary: history.filter(e => e.rarity === 'legendary' && e.result === 'caught').length,
      };
      
      return { caught, fled, total: caught + fled, byRarity };
    } catch (error) {
      console.error('[FIREBASE CATCH HISTORY] Failed to get stats:', error);
      return { caught: 0, fled: 0, total: 0, byRarity: { common: 0, uncommon: 0, rare: 0, legendary: 0 } };
    }
  }
}

export const firebaseCatchHistoryService = new FirebaseCatchHistoryService();

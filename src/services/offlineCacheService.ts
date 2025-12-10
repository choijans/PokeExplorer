import AsyncStorage from '@react-native-async-storage/async-storage';
import database from '@react-native-firebase/database';
import NetInfo from '@react-native-community/netinfo';

interface CacheEntry {
  path: string;
  data: any;
  timestamp: number;
  retries: number;
}

class OfflineCacheService {
  private readonly CACHE_KEY = '@offline_cache';
  private readonly MAX_RETRIES = 3;
  private readonly MAX_CACHE_SIZE = 10;
  private readonly MAX_CACHE_AGE = 6 * 60 * 60 * 1000;
  private syncInProgress = false;

  async addToCache(path: string, data: any): Promise<void> {
    try {
      let cache = await this.getCache();
      
      if (cache.length >= this.MAX_CACHE_SIZE) {
        cache = cache.slice(-5);
      }
      
      const now = Date.now();
      cache = cache.filter(e => (now - e.timestamp) < this.MAX_CACHE_AGE);
      
      cache.push({ path, data, timestamp: now, retries: 0 });
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      if (error.message?.includes('full')) {
        await this.clearCache();
      }
    }
  }

  async getCache(): Promise<CacheEntry[]> {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      return [];
    }
  }

  async syncToFirebase(userId: string): Promise<boolean> {
    if (this.syncInProgress) return false;
    
    try {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) return false;
    } catch {
      return false;
    }
    
    this.syncInProgress = true;
    let success = true;

    try {
      const cache = await this.getCache();
      if (cache.length === 0) return true;

      const failed: CacheEntry[] = [];
      const batch = cache.slice(0, 10);
      
      for (const entry of batch) {
        try {
          await database().ref(entry.path.replace('{userId}', userId)).update(entry.data);
        } catch (error) {
          if (entry.retries < this.MAX_RETRIES) {
            failed.push({ ...entry, retries: entry.retries + 1 });
          }
          success = false;
        }
      }

      const remaining = cache.slice(10);
      const newCache = [...failed, ...remaining];
      
      if (newCache.length > 0) {
        await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(newCache));
      } else {
        await this.clearCache();
      }
    } catch (error) {
      success = false;
    } finally {
      this.syncInProgress = false;
    }
    
    return success;
  }

  async clearCache(): Promise<void> {
    await AsyncStorage.removeItem(this.CACHE_KEY);
  }
  
  async getCacheSize(): Promise<number> {
    const cache = await this.getCache();
    return cache.length;
  }
}

export const offlineCacheService = new OfflineCacheService();

import AsyncStorage from '@react-native-async-storage/async-storage';

class StorageCleanupService {
  async clearOldData(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      console.log(`Found ${keys.length} storage keys`);
      
      // Keep only essential keys
      const keysToKeep = ['discoveredPokemon', 'gyms', 'pokestops', 'friends', 'trades', 'raids'];
      const keysToRemove = keys.filter(k => !keysToKeep.includes(k));
      
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        console.log(`Cleared ${keysToRemove.length} old storage keys`);
      }
    } catch (error) {
      console.error('Storage cleanup error:', error);
    }
  }

  async getStorageSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
      
      return totalSize;
    } catch (error) {
      return 0;
    }
  }
}

export const storageCleanup = new StorageCleanupService();

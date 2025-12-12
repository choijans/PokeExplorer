import AsyncStorage from '@react-native-async-storage/async-storage';

export interface InventoryItem {
  id: string;
  name: string;
  type: 'pokeball' | 'greatball' | 'ultraball' | 'berry' | 'razz' | 'nanab' | 'pinap';
  count: number;
  icon: string;
}

class InventoryService {
  private readonly STORAGE_KEY = '@inventory';

  async getInventory(): Promise<InventoryItem[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (data) return JSON.parse(data);
      
      // Default starter inventory
      const starter: InventoryItem[] = [
        { id: 'pokeball', name: 'Poké Ball', type: 'pokeball', count: 50, icon: '⚪' },
        { id: 'greatball', name: 'Great Ball', type: 'greatball', count: 10, icon: '🔵' },
        { id: 'ultraball', name: 'Ultra Ball', type: 'ultraball', count: 5, icon: '🟡' },
        { id: 'razz', name: 'Razz Berry', type: 'razz', count: 10, icon: '🍓' },
      ];
      await this.saveInventory(starter);
      return starter;
    } catch (error) {
      console.error('Failed to load inventory:', error);
      return [];
    }
  }

  async saveInventory(inventory: InventoryItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(inventory));
    } catch (error) {
      console.error('Failed to save inventory:', error);
    }
  }

  async useItem(itemId: string): Promise<boolean> {
    const inventory = await this.getInventory();
    const item = inventory.find(i => i.id === itemId);
    
    if (!item || item.count <= 0) return false;
    
    item.count--;
    await this.saveInventory(inventory);
    return true;
  }

  async addItem(itemId: string, amount: number = 1): Promise<void> {
    const inventory = await this.getInventory();
    const item = inventory.find(i => i.id === itemId);
    
    if (item) {
      item.count += amount;
    }
    await this.saveInventory(inventory);
  }

  getCatchRateBonus(ballType: string): number {
    const bonuses: { [key: string]: number } = {
      pokeball: 1.0,
      greatball: 1.5,
      ultraball: 2.0,
    };
    return bonuses[ballType] || 1.0;
  }

  getBerryEffect(berryType: string): { catchBonus: number; fleeReduction: number } {
    const effects: { [key: string]: any } = {
      razz: { catchBonus: 0.5, fleeReduction: 0 },
      nanab: { catchBonus: 0, fleeReduction: 0.5 },
      pinap: { catchBonus: 0, fleeReduction: 0 },
    };
    return effects[berryType] || { catchBonus: 0, fleeReduction: 0 };
  }
}

export const inventoryService = new InventoryService();

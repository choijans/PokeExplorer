import database from '@react-native-firebase/database';

export interface InventoryItem {
  id: string;
  name: string;
  type: 'pokeball' | 'greatball' | 'ultraball' | 'berry' | 'razz' | 'nanab' | 'pinap';
  count: number;
  icon: string;
}

class FirebaseInventoryService {
  async getInventory(userId: string): Promise<InventoryItem[]> {
    try {
      const snapshot = await database().ref(`users/${userId}/inventory`).once('value');
      const data = snapshot.val();
      
      if (data) {
        return Object.entries(data).map(([id, item]: [string, any]) => ({
          id,
          ...item,
        }));
      }
      
      // Initialize default inventory
      const starter: InventoryItem[] = [
        { id: 'pokeball', name: 'Poké Ball', type: 'pokeball', count: 50, icon: '⚪' },
        { id: 'greatball', name: 'Great Ball', type: 'greatball', count: 10, icon: '🔵' },
        { id: 'ultraball', name: 'Ultra Ball', type: 'ultraball', count: 5, icon: '🟡' },
        { id: 'razz', name: 'Razz Berry', type: 'razz', count: 10, icon: '🍓' },
      ];
      
      await this.initializeInventory(userId, starter);
      return starter;
    } catch (error) {
      console.error('Failed to load inventory:', error);
      return [];
    }
  }

  async initializeInventory(userId: string, items: InventoryItem[]): Promise<void> {
    try {
      const inventoryData: any = {};
      items.forEach(item => {
        inventoryData[item.id] = {
          name: item.name,
          type: item.type,
          count: item.count,
          icon: item.icon,
        };
      });
      await database().ref(`users/${userId}/inventory`).set(inventoryData);
    } catch (error) {
      console.error('Failed to initialize inventory:', error);
    }
  }

  async useItem(userId: string, itemId: string): Promise<boolean> {
    try {
      const itemRef = database().ref(`users/${userId}/inventory/${itemId}`);
      const snapshot = await itemRef.once('value');
      const item = snapshot.val();
      
      if (!item || item.count <= 0) return false;
      
      await itemRef.update({ count: item.count - 1 });
      return true;
    } catch (error) {
      console.error('Failed to use item:', error);
      return false;
    }
  }

  async addItem(userId: string, itemId: string, amount: number = 1): Promise<void> {
    try {
      const itemRef = database().ref(`users/${userId}/inventory/${itemId}`);
      const snapshot = await itemRef.once('value');
      const item = snapshot.val();
      
      if (item) {
        await itemRef.update({ count: item.count + amount });
      } else {
        const itemData = this.getItemData(itemId);
        await itemRef.set({ ...itemData, count: amount });
      }
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  }

  private getItemData(itemId: string): { name: string; type: string; icon: string } {
    const items: Record<string, any> = {
      pokeball: { name: 'Poké Ball', type: 'pokeball', icon: '⚪' },
      greatball: { name: 'Great Ball', type: 'greatball', icon: '🔵' },
      ultraball: { name: 'Ultra Ball', type: 'ultraball', icon: '🟡' },
      masterball: { name: 'Master Ball', type: 'masterball', icon: '🟣' },
      razz: { name: 'Razz Berry', type: 'razz', icon: '🍓' },
      nanab: { name: 'Nanab Berry', type: 'nanab', icon: '🍌' },
      pinap: { name: 'Pinap Berry', type: 'pinap', icon: '🍍' },
      goldenrazz: { name: 'Golden Razz', type: 'goldenrazz', icon: '✨' },
      incense: { name: 'Incense', type: 'incense', icon: '💨' },
      luckyegg: { name: 'Lucky Egg', type: 'luckyegg', icon: '🥚' },
      starpiece: { name: 'Star Piece', type: 'starpiece', icon: '⭐' },
    };
    return items[itemId] || { name: itemId, type: itemId, icon: '❓' };
  }

  subscribeToInventory(userId: string, callback: (inventory: InventoryItem[]) => void): () => void {
    const ref = database().ref(`users/${userId}/inventory`);
    
    const listener = ref.on('value', (snapshot) => {
      const data = snapshot.val();
      const inventory: InventoryItem[] = data ? Object.entries(data).map(([id, item]: [string, any]) => ({ id, ...item })) : [];
      callback(inventory);
    });

    return () => ref.off('value', listener);
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

export const firebaseInventoryService = new FirebaseInventoryService();

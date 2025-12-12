import database from '@react-native-firebase/database';
import Geolocation from '@react-native-community/geolocation';

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  icon: string;
  sprite?: string;
  type: 'ball' | 'berry' | 'booster' | 'lure';
  category: 'pokeball' | 'berry' | 'catch-boost' | 'map-lure' | 'xp-boost';
  stock: number;
  maxStock: number;
  effect: ItemEffect;
  description: string;
}

export interface ItemEffect {
  type: 'catch-rate' | 'fill-speed' | 'drain-speed' | 'zone-size' | 'acceleration' |
        'pokemon-speed' | 'quality-boost' | 'candy-multiplier' | 'spawn-rate' | 
        'xp-multiplier' | 'coin-multiplier';
  value: number;
  duration?: number;
}

export interface Shop {
  id: string;
  type: 'mart' | 'berry' | 'general' | 'premium';
  items: ShopItem[];
  spawnedAt: number;
  expiresAt: number;
}

class ShopService {
  private readonly SHOP_ITEMS: Record<string, Omit<ShopItem, 'stock'>> = {
    pokeball: { id: 'pokeball', name: 'Poké Ball', price: 100, icon: '⚪', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png', type: 'ball', category: 'pokeball', maxStock: 10, effect: { type: 'catch-rate', value: 1.0 }, description: 'Standard catch rate' },
    greatball: { id: 'greatball', name: 'Great Ball', price: 300, icon: '🔵', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png', type: 'ball', category: 'pokeball', maxStock: 8, effect: { type: 'catch-rate', value: 1.5 }, description: 'Higher catch rate' },
    ultraball: { id: 'ultraball', name: 'Ultra Ball', price: 800, icon: '🟡', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png', type: 'ball', category: 'pokeball', maxStock: 5, effect: { type: 'catch-rate', value: 2.0 }, description: 'Very high catch rate' },
    masterball: { id: 'masterball', name: 'Master Ball', price: 5000, icon: '🟣', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png', type: 'ball', category: 'pokeball', maxStock: 1, effect: { type: 'catch-rate', value: 100 }, description: 'Never fails!' },
    razz: { id: 'razz', name: 'Razz Berry', price: 50, icon: '🍓', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/razz-berry.png', type: 'berry', category: 'berry', maxStock: 10, effect: { type: 'fill-speed', value: 0.2 }, description: 'Easier to catch' },
    nanab: { id: 'nanab', name: 'Nanab Berry', price: 50, icon: '🍌', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/nanab-berry.png', type: 'berry', category: 'berry', maxStock: 10, effect: { type: 'drain-speed', value: -0.1 }, description: 'Calms Pokémon' },
    pinap: { id: 'pinap', name: 'Pinap Berry', price: 100, icon: '🍍', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/pinap-berry.png', type: 'berry', category: 'berry', maxStock: 8, effect: { type: 'candy-multiplier', value: 2.0 }, description: 'Double candy' },
    goldenrazz: { id: 'goldenrazz', name: 'Golden Razz', price: 200, icon: '🍒', type: 'berry', category: 'berry', maxStock: 5, effect: { type: 'fill-speed', value: 0.4 }, description: 'Much easier catch' },
    silverpinap: { id: 'silverpinap', name: 'Silver Pinap', price: 150, icon: '�', type: 'berry', category: 'berry', maxStock: 5, effect: { type: 'candy-multiplier', value: 1.5 }, description: '1.5x candy + easier' },

    basiclure: { id: 'basiclure', name: 'Basic Lure', price: 200, icon: '🎣', type: 'lure', category: 'map-lure', maxStock: 5, effect: { type: 'spawn-rate', value: 1, duration: 600 }, description: '1 spawn/min (10min)' },
    superlure: { id: 'superlure', name: 'Super Lure', price: 500, icon: '🎣', type: 'lure', category: 'map-lure', maxStock: 3, effect: { type: 'spawn-rate', value: 2, duration: 900 }, description: '2 spawn/min (15min)' },
    rarelure: { id: 'rarelure', name: 'Rare Lure', price: 1000, icon: '🌟', type: 'lure', category: 'map-lure', maxStock: 2, effect: { type: 'spawn-rate', value: 1.5, duration: 1200 }, description: 'Rare spawns (20min)' },
    luckyegg: { id: 'luckyegg', name: 'Lucky Egg', price: 800, icon: '🥚', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/lucky-egg.png', type: 'booster', category: 'xp-boost', maxStock: 3, effect: { type: 'xp-multiplier', value: 2.0, duration: 1800 }, description: '2x XP (30min)' },
    starpiece: { id: 'starpiece', name: 'Star Piece', price: 800, icon: '⭐', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/star-piece.png', type: 'booster', category: 'xp-boost', maxStock: 3, effect: { type: 'coin-multiplier', value: 1.5, duration: 1800 }, description: '1.5x coins (30min)' },
    superegg: { id: 'superegg', name: 'Super Egg', price: 1500, icon: '🥚', type: 'booster', category: 'xp-boost', maxStock: 2, effect: { type: 'xp-multiplier', value: 3.0, duration: 900 }, description: '3x XP (15min)' },
  };

  private getShopItems(type: Shop['type']): ShopItem[] {
    const items = this.SHOP_ITEMS;
    const shouldSpawn = (rarity: 'common' | 'uncommon' | 'rare' | 'legendary') => {
      const chances = { common: 1.0, uncommon: 0.7, rare: 0.3, legendary: 0.1 };
      return Math.random() < chances[rarity];
    };
    const addStock = (item: Omit<ShopItem, 'stock'>, spawned: boolean): ShopItem => ({
      ...item,
      stock: spawned ? Math.floor(item.maxStock * (0.5 + Math.random() * 0.5)) : 0
    });
    
    return [
      addStock(items.pokeball, true),
      addStock(items.greatball, true),
      addStock(items.ultraball, shouldSpawn('uncommon')),
      addStock(items.masterball, shouldSpawn('legendary')),
      addStock(items.razz, true),
      addStock(items.nanab, true),
      addStock(items.pinap, shouldSpawn('uncommon')),
      addStock(items.goldenrazz, shouldSpawn('rare')),
      addStock(items.silverpinap, shouldSpawn('rare')),
      addStock(items.basiclure, shouldSpawn('uncommon')),
      addStock(items.superlure, shouldSpawn('rare')),
      addStock(items.rarelure, shouldSpawn('legendary')),
      addStock(items.luckyegg, shouldSpawn('uncommon')),
      addStock(items.starpiece, shouldSpawn('uncommon')),
      addStock(items.superegg, shouldSpawn('rare')),
    ];
  }

  generateShop(): Shop {
    const types: Shop['type'][] = ['mart', 'berry', 'general', 'premium'];
    const weights = [0.4, 0.3, 0.25, 0.05];
    const rand = Math.random();
    let sum = 0;
    let shopType: Shop['type'] = 'mart';
    for (let i = 0; i < types.length; i++) {
      sum += weights[i];
      if (rand <= sum) {
        shopType = types[i];
        break;
      }
    }
    
    return {
      id: Date.now().toString(),
      type: shopType,
      items: this.getShopItems(shopType),
      spawnedAt: Date.now(),
      expiresAt: Date.now() + 300000,
    };
  }

  async purchaseItem(shop: Shop, itemId: string): Promise<Shop> {
    const updatedItems = shop.items.map(item => 
      item.id === itemId && item.stock > 0
        ? { ...item, stock: item.stock - 1 }
        : item
    );
    return { ...shop, items: updatedItems };
  }




}

export const shopService = new ShopService();

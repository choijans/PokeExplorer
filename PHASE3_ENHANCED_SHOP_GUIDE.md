# 🏪 PHASE 3: ENHANCED SHOP SYSTEM - IMPLEMENTATION GUIDE

## 📋 Overview
Transform the basic shop into a comprehensive item store with:
- Real Pokeball sprites
- Limited stock per item (5-10 units)
- Unique catch-assist items
- Map lures for Pokemon attraction
- Better UI/UX with stock indicators

---

## 🎯 Goals

### 1. Move Shop Icon to Info Panel
- Remove from header
- Add to bottom info panel (next to "Caught: 0/4")
- Use React Native Paper IconButton with badge

### 2. Enhanced Item System
**Pokeballs (with real sprites):**
- Poké Ball (100 coins, stock: 10) - 18% zone, 0.4 fill
- Great Ball (300 coins, stock: 8) - 22% zone, 0.6 fill
- Ultra Ball (800 coins, stock: 5) - 26% zone, 0.8 fill
- Master Ball (5000 coins, stock: 1) - 100% catch rate

**Berries (catch assistance):**
- Razz Berry (50 coins, stock: 10) - +0.2 fill speed
- Nanab Berry (50 coins, stock: 10) - -0.1 drain speed
- Pinap Berry (100 coins, stock: 8) - 2x candy reward
- Golden Razz (200 coins, stock: 5) - +0.4 fill speed
- Silver Pinap (150 coins, stock: 5) - 1.5x candy + easier catch

**Catch Boosters (minigame modifiers):**
- Quick Hands (300 coins, stock: 5) - +50% acceleration speed
- Steady Aim (250 coins, stock: 5) - Larger capture zone (+5%)
- Time Warp (400 coins, stock: 3) - Slower Pokemon movement
- Perfect Throw (500 coins, stock: 3) - Auto-Excellent quality

**Map Lures (Pokemon attraction):**
- Basic Lure (200 coins, stock: 5) - Spawn 1 Pokemon/min for 10min
- Super Lure (500 coins, stock: 3) - Spawn 2 Pokemon/min for 15min
- Rare Lure (1000 coins, stock: 2) - Spawn rare Pokemon for 20min
- Shiny Lure (2500 coins, stock: 1) - Increased shiny chance for 30min

**XP/Coin Boosters:**
- Lucky Egg (800 coins, stock: 3) - 2x XP for 30min
- Star Piece (800 coins, stock: 3) - 1.5x coins for 30min
- Super Egg (1500 coins, stock: 2) - 3x XP for 15min

### 3. Stock Management
- Each item has limited stock (5-10 units)
- Stock refreshes every 5 minutes with shop
- Display "x5 left" badge on items
- Sold out items show "SOLD OUT" and disabled

---

## 🎨 UI/UX Design

### Shop Modal Layout
```
┌─────────────────────────────────┐
│  🏪 Poké Mart          [X]      │
│  Refreshes in 4:32              │
├─────────────────────────────────┤
│  [POKEBALLS] [BERRIES] [BOOST]  │ ← Tabs
├─────────────────────────────────┤
│  ┌──────────────────────────┐   │
│  │ 🔴 Poké Ball    x8 left  │   │
│  │ Standard catch rate      │   │
│  │ 💰 100 coins    [BUY]    │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │ 🔵 Great Ball   x5 left  │   │
│  │ Higher catch rate        │   │
│  │ 💰 300 coins    [BUY]    │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │ 🟡 Ultra Ball   SOLD OUT │   │
│  │ Very high catch rate     │   │
│  │ 💰 800 coins    [---]    │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

### Info Panel with Shop Icon
```
┌─────────────────────────────────┐
│ ⭐ Caught: 3/15                  │
│ 🏪 Shop (4:32)  Get within 100m │
└─────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### 1. Shop Service Updates

**File:** `src/services/shopService.ts`

```typescript
export interface ShopItem {
  id: string;
  name: string;
  price: number;
  icon: string;
  sprite?: string; // URL to sprite image
  type: 'ball' | 'berry' | 'booster' | 'lure';
  category: 'pokeball' | 'berry' | 'catch-boost' | 'map-lure' | 'xp-boost';
  stock: number;
  maxStock: number;
  effect: ItemEffect;
  description: string;
}

export interface ItemEffect {
  type: 'catch-rate' | 'fill-speed' | 'drain-speed' | 'zone-size' | 
        'pokemon-speed' | 'quality-boost' | 'candy-multiplier' | 
        'spawn-rate' | 'xp-multiplier' | 'coin-multiplier';
  value: number;
  duration?: number; // in seconds for timed effects
}

export interface Shop {
  id: string;
  type: 'mart' | 'berry' | 'general' | 'premium';
  items: ShopItem[];
  spawnedAt: number;
  expiresAt: number;
}
```

**Item Definitions:**
```typescript
private readonly SHOP_ITEMS: Record<string, ShopItem> = {
  // Pokeballs
  pokeball: {
    id: 'pokeball',
    name: 'Poké Ball',
    price: 100,
    icon: '⚪',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png',
    type: 'ball',
    category: 'pokeball',
    stock: 10,
    maxStock: 10,
    effect: { type: 'catch-rate', value: 1.0 },
    description: 'Standard Poké Ball'
  },
  greatball: {
    id: 'greatball',
    name: 'Great Ball',
    price: 300,
    icon: '🔵',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png',
    type: 'ball',
    category: 'pokeball',
    stock: 8,
    maxStock: 8,
    effect: { type: 'catch-rate', value: 1.5 },
    description: 'Higher catch rate'
  },
  ultraball: {
    id: 'ultraball',
    name: 'Ultra Ball',
    price: 800,
    icon: '🟡',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png',
    type: 'ball',
    category: 'pokeball',
    stock: 5,
    maxStock: 5,
    effect: { type: 'catch-rate', value: 2.0 },
    description: 'Very high catch rate'
  },
  masterball: {
    id: 'masterball',
    name: 'Master Ball',
    price: 5000,
    icon: '🟣',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png',
    type: 'ball',
    category: 'pokeball',
    stock: 1,
    maxStock: 1,
    effect: { type: 'catch-rate', value: 100 },
    description: 'Never fails!'
  },
  
  // Berries
  razz: {
    id: 'razz',
    name: 'Razz Berry',
    price: 50,
    icon: '🍓',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/razz-berry.png',
    type: 'berry',
    category: 'berry',
    stock: 10,
    maxStock: 10,
    effect: { type: 'fill-speed', value: 0.2 },
    description: 'Easier to catch'
  },
  nanab: {
    id: 'nanab',
    name: 'Nanab Berry',
    price: 50,
    icon: '🍌',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/nanab-berry.png',
    type: 'berry',
    category: 'berry',
    stock: 10,
    maxStock: 10,
    effect: { type: 'drain-speed', value: -0.1 },
    description: 'Calms Pokémon'
  },
  pinap: {
    id: 'pinap',
    name: 'Pinap Berry',
    price: 100,
    icon: '🍍',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/pinap-berry.png',
    type: 'berry',
    category: 'berry',
    stock: 8,
    maxStock: 8,
    effect: { type: 'candy-multiplier', value: 2.0 },
    description: 'Double candy'
  },
  goldenrazz: {
    id: 'goldenrazz',
    name: 'Golden Razz',
    price: 200,
    icon: '✨',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/golden-razz-berry.png',
    type: 'berry',
    category: 'berry',
    stock: 5,
    maxStock: 5,
    effect: { type: 'fill-speed', value: 0.4 },
    description: 'Much easier catch'
  },
  silverpinap: {
    id: 'silverpinap',
    name: 'Silver Pinap',
    price: 150,
    icon: '🌟',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/silver-pinap-berry.png',
    type: 'berry',
    category: 'berry',
    stock: 5,
    maxStock: 5,
    effect: { type: 'candy-multiplier', value: 1.5 },
    description: '1.5x candy + easier'
  },
  
  // Catch Boosters
  quickhands: {
    id: 'quickhands',
    name: 'Quick Hands',
    price: 300,
    icon: '⚡',
    type: 'booster',
    category: 'catch-boost',
    stock: 5,
    maxStock: 5,
    effect: { type: 'zone-speed', value: 1.5 },
    description: '+50% acceleration'
  },
  steadyaim: {
    id: 'steadyaim',
    name: 'Steady Aim',
    price: 250,
    icon: '🎯',
    type: 'booster',
    category: 'catch-boost',
    stock: 5,
    maxStock: 5,
    effect: { type: 'zone-size', value: 5 },
    description: '+5% larger zone'
  },
  timewarp: {
    id: 'timewarp',
    name: 'Time Warp',
    price: 400,
    icon: '⏰',
    type: 'booster',
    category: 'catch-boost',
    stock: 3,
    maxStock: 3,
    effect: { type: 'pokemon-speed', value: 0.5 },
    description: 'Slower Pokémon'
  },
  perfectthrow: {
    id: 'perfectthrow',
    name: 'Perfect Throw',
    price: 500,
    icon: '💯',
    type: 'booster',
    category: 'catch-boost',
    stock: 3,
    maxStock: 3,
    effect: { type: 'quality-boost', value: 100 },
    description: 'Auto-Excellent'
  },
  
  // Map Lures
  basiclure: {
    id: 'basiclure',
    name: 'Basic Lure',
    price: 200,
    icon: '🎣',
    type: 'lure',
    category: 'map-lure',
    stock: 5,
    maxStock: 5,
    effect: { type: 'spawn-rate', value: 1, duration: 600 },
    description: '1 spawn/min (10min)'
  },
  superlure: {
    id: 'superlure',
    name: 'Super Lure',
    price: 500,
    icon: '🎣',
    type: 'lure',
    category: 'map-lure',
    stock: 3,
    maxStock: 3,
    effect: { type: 'spawn-rate', value: 2, duration: 900 },
    description: '2 spawn/min (15min)'
  },
  rarelure: {
    id: 'rarelure',
    name: 'Rare Lure',
    price: 1000,
    icon: '🌟',
    type: 'lure',
    category: 'map-lure',
    stock: 2,
    maxStock: 2,
    effect: { type: 'spawn-rate', value: 1.5, duration: 1200 },
    description: 'Rare spawns (20min)'
  },
  
  // XP/Coin Boosters
  luckyegg: {
    id: 'luckyegg',
    name: 'Lucky Egg',
    price: 800,
    icon: '🥚',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/lucky-egg.png',
    type: 'booster',
    category: 'xp-boost',
    stock: 3,
    maxStock: 3,
    effect: { type: 'xp-multiplier', value: 2.0, duration: 1800 },
    description: '2x XP (30min)'
  },
  starpiece: {
    id: 'starpiece',
    name: 'Star Piece',
    price: 800,
    icon: '⭐',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/star-piece.png',
    type: 'booster',
    category: 'xp-boost',
    stock: 3,
    maxStock: 3,
    effect: { type: 'coin-multiplier', value: 1.5, duration: 1800 },
    description: '1.5x coins (30min)'
  },
  superegg: {
    id: 'superegg',
    name: 'Super Egg',
    price: 1500,
    icon: '🥚',
    type: 'booster',
    category: 'xp-boost',
    stock: 2,
    maxStock: 2,
    effect: { type: 'xp-multiplier', value: 3.0, duration: 900 },
    description: '3x XP (15min)'
  }
};
```

### 2. Shop Modal Updates

**File:** `src/components/ShopModal.tsx`

**Features:**
- Tabbed interface (Pokeballs, Berries, Boosters, Lures)
- Stock counter badges
- Sold out state
- Item sprites instead of emojis
- Better descriptions
- Refresh countdown

**Layout:**
```tsx
<Modal>
  <Header>
    <Title>Shop Type</Title>
    <Countdown>Refreshes in 4:32</Countdown>
  </Header>
  
  <Tabs>
    <Tab active={tab === 'balls'}>Pokeballs</Tab>
    <Tab active={tab === 'berries'}>Berries</Tab>
    <Tab active={tab === 'boosters'}>Boosters</Tab>
    <Tab active={tab === 'lures'}>Lures</Tab>
  </Tabs>
  
  <ItemList>
    {items.map(item => (
      <ItemCard soldOut={item.stock === 0}>
        <ItemSprite src={item.sprite} />
        <ItemInfo>
          <ItemName>{item.name}</ItemName>
          <ItemDescription>{item.description}</ItemDescription>
          <ItemEffect>{formatEffect(item.effect)}</ItemEffect>
        </ItemInfo>
        <ItemActions>
          <StockBadge>x{item.stock} left</StockBadge>
          <Price>💰 {item.price}</Price>
          <BuyButton disabled={item.stock === 0}>
            {item.stock > 0 ? 'BUY' : 'SOLD OUT'}
          </BuyButton>
        </ItemActions>
      </ItemCard>
    ))}
  </ItemList>
</Modal>
```

### 3. Hunt Screen Updates

**File:** `src/screens/HuntScreen.tsx`

**Changes:**
- Move shop icon from header to info panel
- Add badge showing refresh timer
- Show shop type indicator

```tsx
<View style={styles.infoPanel}>
  <View style={styles.infoRow}>
    <Text>⭐ Caught: {caught}/{total}</Text>
    <TouchableOpacity onPress={openShop} style={styles.shopButton}>
      <IconButton icon="store" size={20} />
      <Text style={styles.shopTimer}>🏪 {formatTime(timeLeft)}</Text>
      <Badge>{shopType}</Badge>
    </TouchableOpacity>
  </View>
  <Text>Get within 100m to catch!</Text>
</View>
```

### 4. Active Effects System

**File:** `src/services/activeEffectsService.ts`

```typescript
export interface ActiveEffect {
  itemId: string;
  type: string;
  value: number;
  activatedAt: number;
  expiresAt: number;
}

class ActiveEffectsService {
  async activateEffect(userId: string, item: ShopItem): Promise<void>;
  async getActiveEffects(userId: string): Promise<ActiveEffect[]>;
  async isEffectActive(userId: string, type: string): Promise<boolean>;
  async applyEffectToCapture(userId: string, baseConfig: any): Promise<any>;
}
```

### 5. AR Capture Integration

**File:** `src/screens/ARCaptureScreen.tsx`

**Apply active effects:**
```typescript
// On minigame start
const activeEffects = await activeEffectsService.getActiveEffects(user.uid);

// Modify config based on effects
if (hasEffect('fill-speed')) {
  config.fillSpeed += effect.value;
}
if (hasEffect('zone-size')) {
  config.sweetSpotSize += effect.value;
}
if (hasEffect('pokemon-speed')) {
  pokemonVelocity *= effect.value;
}
if (hasEffect('quality-boost')) {
  forceQuality = 'Excellent';
}
```

---

## 📦 Implementation Steps

### Step 1: Update Shop Service
- [ ] Add new item definitions with sprites
- [ ] Add stock management
- [ ] Add effect system
- [ ] Update shop generation with stock

### Step 2: Enhance Shop Modal
- [ ] Add tabbed interface
- [ ] Display item sprites
- [ ] Show stock counters
- [ ] Add sold out state
- [ ] Better item descriptions

### Step 3: Move Shop Icon
- [ ] Remove from header
- [ ] Add to info panel
- [ ] Add refresh timer badge
- [ ] Add shop type indicator

### Step 4: Active Effects Service
- [ ] Create service
- [ ] Firebase integration
- [ ] Effect activation
- [ ] Effect expiration

### Step 5: AR Capture Integration
- [ ] Load active effects
- [ ] Apply to minigame config
- [ ] Show active effect indicators
- [ ] Handle effect expiration

### Step 6: Map Lure System
- [ ] Lure activation
- [ ] Increased spawn rate
- [ ] Visual indicator on map
- [ ] Timer display

---

## 🎨 Visual Enhancements

### Item Cards
- Use actual Pokeball sprites from PokeAPI
- Stock badge in top-right corner
- Sold out overlay with grayscale
- Effect description with icons

### Shop Types
- **Mart** 🏪: Pokeballs only
- **Berry Shop** 🍓: Berries + catch boosters
- **General Store** 🏬: Mixed items
- **Premium Shop** 💎: Rare items + lures

### Active Effects Display
- Floating badge on Hunt screen
- Timer countdown
- Effect icon
- Tap to see details

---

## 🔥 Key Features

1. **Limited Stock** - Creates urgency and strategy
2. **Real Sprites** - Professional Pokemon GO feel
3. **Unique Effects** - Each item has gameplay impact
4. **Timed Buffs** - XP/coin multipliers with duration
5. **Map Lures** - Attract more Pokemon
6. **Catch Boosters** - Modify minigame mechanics
7. **Stock Refresh** - Every 5 minutes with shop rotation

---

## 📊 Economy Balance

**Earning Rate:**
- Average catch: 500-1000 coins
- With Star Piece: 750-1500 coins

**Spending:**
- Basic supplies: 50-300 coins
- Catch boosters: 250-500 coins
- Premium items: 800-2500 coins
- Master Ball: 5000 coins (rare)

**Stock Limits:**
- Common items: 10 stock
- Uncommon: 5-8 stock
- Rare: 3 stock
- Legendary: 1 stock

---

## ✅ Ready to Implement?

This guide provides:
- Complete item definitions
- UI/UX mockups
- Technical architecture
- Implementation steps
- Economy balance

Proceed with implementation? 🚀

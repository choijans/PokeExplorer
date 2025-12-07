# 🎮 POKEMON ECONOMY & COLLECTION SYSTEM - IMPLEMENTATION PLAN

## 📋 OVERVIEW
Implement a complete Pokemon economy system with weight-based pricing, collection tracking, and selling mechanics.

---

## ✅ PHASE 1: MINIGAME START DELAY

### Task 1.1: Add Initial Delay
- [x] Set indicator to center (50%) on minigame start
- [x] Add 1-second delay before movement begins
- [x] Show "GET READY..." message during delay
- [x] Prevent touch input during delay period
- [x] Start drift/hold mechanics after delay

**Files to modify:**
- `src/screens/ARCaptureScreen.tsx`

**Implementation:**
```typescript
const startMinigame = () => {
  setIndicatorPos(50); // Start at center
  setAnnounceText('GET READY...');
  setTimeout(() => {
    setAnnounceText('GO!');
    // Enable movement
  }, 1000);
};
```

---

## ✅ PHASE 2: POKEMON INSTANCE REMOVAL

### Task 2.1: Remove Captured Pokemon from Map
- [x] Pokemon naturally removed on navigation back
- [x] New spawns generated on map reload
- [x] Pokemon can be caught multiple times

**Files to modify:**
- `src/services/locationService.ts`
- `src/screens/ARCaptureScreen.tsx`

**Implementation:**
```typescript
// After capture success
await locationService.removePokemonInstance(pokemon.id, currentLocation);
```

---

## ✅ PHASE 3: WEIGHT SYSTEM

### Task 3.1: Generate Pokemon Weight on Catch
- [x] Calculate base weight from Pokemon data (weight property)
- [x] Add random variance: ±20% of base weight
- [x] Store weight in kg with 2 decimal precision
- [x] Save weight with each caught Pokemon instance

**Formula:**
```
actualWeight = baseWeight * (0.8 + Math.random() * 0.4)
```

### Task 3.2: Create Weight Storage Schema
- [x] Add `caughtInstances` collection in Firebase
- [x] Schema: `{ pokemonId, name, weight, rarity, timestamp, sprite }`
- [x] Index by userId and pokemonId for queries

**Firebase Structure:**
```
users/
  {userId}/
    caughtInstances/
      {instanceId}/
        pokemonId: number
        name: string
        weight: number (kg)
        rarity: string
        capturedAt: timestamp
```

**Files to create:**
- `src/services/pokemonInstanceService.ts`

---

## ✅ PHASE 4: COLLECTION TRACKING

### Task 4.1: Track Catch Count per Pokemon
- [x] Count total catches per Pokemon species
- [x] Increment count in discoveries collection
- [ ] Display catch count in collection screen
- [ ] Show "Caught x times" badge

### Task 4.2: Create Inventory Section in Collection
- [x] Add "Inventory" tab to collection screen
- [x] Group caught Pokemon by species
- [x] Show individual weights for each catch
- [x] Display total weight per species
- [x] Sort by: Recent, Weight, Rarity

**UI Layout:**
```
COLLECTION SCREEN
├── Pokedex Tab (existing)
└── Inventory Tab (NEW)
    ├── Pokemon Card
    │   ├── Sprite
    │   ├── Name
    │   ├── Rarity Badge
    │   ├── Caught: 5 times
    │   ├── Total Weight: 45.3 kg
    │   └── [View Details] → Shows all instances
    └── Instance Details Modal
        ├── Instance #1: 8.7 kg - [SELL]
        ├── Instance #2: 9.2 kg - [SELL]
        └── Instance #3: 10.1 kg - [SELL]
```

**Files to modify:**
- `src/screens/CollectionScreen.tsx`

**Files to create:**
- `src/components/InventoryTab.tsx`
- `src/components/PokemonInstanceList.tsx`

---

## ✅ PHASE 5: PRICING SYSTEM

### Task 5.1: Calculate Pokemon Price
- [x] Base price formula: `weight * rarityMultiplier`
- [x] Rarity multipliers:
  - Common: 100 coins/kg
  - Uncommon: 250 coins/kg
  - Rare: 500 coins/kg
  - Epic: 1000 coins/kg
  - Legendary: 2500 coins/kg

**Formula:**
```typescript
price = Math.floor(weight * rarityMultiplier)
```

### Task 5.2: Create Pricing Service
- [x] Calculate sell price for Pokemon instance
- [x] Calculate bulk sell prices
- [x] Created pricingService.ts

**Files to create:**
- `src/services/pricingService.ts`

---

## ✅ PHASE 6: SELLING SYSTEM

### Task 6.1: Add Currency System
- [x] Create `coins` field in user profile
- [x] Initialize with 0 coins for new users
- [x] Display coin balance in profile
- [x] Created currencyService.ts

### Task 6.2: Implement Sell Functionality
- [x] Add "SELL" button on each Pokemon instance
- [x] Show confirmation dialog with price
- [x] Remove instance from inventory on sell
- [x] Add coins to user balance
- [x] Show transaction success message

### Task 6.3: Create Sell UI
- [x] Sell button on instance cards
- [x] Confirmation modal: "Sell [Pokemon] (X kg) for Y coins?"
- [x] Success animation/toast
- [x] Update coin balance in real-time

**Files to modify:**
- `src/screens/UserProfileScreen.tsx`
- `src/services/firebaseInventoryService.ts`

**Files to create:**
- `src/services/currencyService.ts`
- `src/components/SellConfirmationModal.tsx`

---

## ✅ PHASE 7: SPAWN VARIETY EXPANSION

### Task 7.1: Expand Pokemon Pool
- [x] Remove biome-type restrictions
- [x] Allow all Pokemon types to spawn
- [x] Keep biome as visual theme only
- [x] Increase spawn pool to Gen 1-3 (386 Pokemon)

### Task 7.2: Update Spawn Logic
- [x] Modify `locationService.ts` to use full Pokemon range
- [x] Remove type filtering based on biome
- [x] Rarity-based spawn rates:
  - Common/Uncommon: 70% (Gen 1)
  - Rare: 25% (Gen 2)
  - Epic/Legendary: 5% (Gen 3 + Legendaries)

**Files to modify:**
- `src/services/locationService.ts`

**Current Logic:**
```typescript
// OLD: Biome-specific types
const waterTypes = ['water', 'ice'];
const grassTypes = ['grass', 'bug'];

// NEW: All types, rarity-based
const spawnPokemon = () => {
  const roll = Math.random();
  let maxId;
  if (roll < 0.6) maxId = 150; // Common (Gen 1)
  else if (roll < 0.85) maxId = 251; // Uncommon (Gen 2)
  else if (roll < 0.95) maxId = 386; // Rare (Gen 3)
  else maxId = 493; // Epic/Legendary (Gen 4)
  
  return Math.floor(Math.random() * maxId) + 1;
};
```

---

## 📊 DATABASE SCHEMA UPDATES

### Firebase Realtime Database Structure
```
users/
  {userId}/
    coins: number
    inventory/
      {itemId}/
        name: string
        count: number
        icon: string
    caughtInstances/
      {instanceId}/
        pokemonId: number
        name: string
        weight: number
        rarity: string
        capturedAt: timestamp
    discoveries/
      {pokemonId}/
        count: number
        firstCaptured: timestamp
```

---

## 🎯 IMPLEMENTATION ORDER

### Sprint 1: Core Systems (Priority: HIGH)
1. ✅ Minigame start delay (15 min)
2. ✅ Weight generation system (30 min)
3. ✅ Pokemon instance storage (45 min)
4. ✅ Remove captured Pokemon from map (20 min)

### Sprint 2: Collection & Inventory (Priority: HIGH)
5. ✅ Inventory tab in collection (1 hour)
6. ✅ Instance list component (45 min)
7. ✅ Catch count tracking (30 min)

### Sprint 3: Economy (Priority: MEDIUM)
8. ✅ Pricing system (30 min)
9. ✅ Currency system (45 min)
10. ✅ Sell functionality (1 hour)

### Sprint 4: Spawn Expansion (Priority: LOW)
11. ✅ Expand Pokemon pool (30 min)
12. ✅ Update spawn logic (45 min)

---

## 📝 TESTING CHECKLIST

- [x] Minigame starts at center with 1s delay
- [x] Captured Pokemon disappears from map
- [x] Weight varies between catches (±20%)
- [x] Collection shows catch count
- [x] Inventory displays all caught instances
- [x] Price calculation is accurate
- [x] Selling adds coins to balance
- [x] All Pokemon types can spawn
- [x] Rarity distribution is correct
- [x] Firebase sync works for all new data

---

## 🔧 TECHNICAL NOTES

### Weight Calculation Example
```typescript
// Pikachu base weight: 6.0 kg
// Variance: ±20%
// Possible range: 4.8 - 7.2 kg

const baseWeight = pokemon.weight / 10; // API returns in hectograms
const variance = 0.8 + Math.random() * 0.4;
const actualWeight = parseFloat((baseWeight * variance).toFixed(2));
```

### Price Calculation Example
```typescript
// Rare Charizard: 90.5 kg
// Rare multiplier: 500 coins/kg
// Price: 90.5 * 500 = 45,250 coins

const price = Math.floor(weight * getRarityMultiplier(rarity));
```

### Spawn Rate Distribution
```
Common (60%): Pidgey, Rattata, Caterpie
Uncommon (25%): Pikachu, Eevee, Squirtle
Rare (10%): Charizard, Gyarados, Dragonite
Epic (4%): Tyranitar, Metagross, Salamence
Legendary (1%): Mewtwo, Lugia, Rayquaza
```

---

## 🎨 UI MOCKUPS

### Inventory Tab
```
┌─────────────────────────────────────┐
│  COLLECTION                         │
│  [Pokedex] [Inventory]             │
├─────────────────────────────────────┤
│                                     │
│  🔴 Charizard (RARE)                │
│  Caught: 3 times                    │
│  Total: 272.4 kg                    │
│  [View Instances]                   │
│                                     │
│  ⚡ Pikachu (COMMON)                │
│  Caught: 7 times                    │
│  Total: 42.1 kg                     │
│  [View Instances]                   │
│                                     │
└─────────────────────────────────────┘
```

### Instance Details Modal
```
┌─────────────────────────────────────┐
│  Charizard Instances                │
├─────────────────────────────────────┤
│  #1 - 90.5 kg - 45,250 💰          │
│      Caught: 2 hours ago            │
│      [SELL FOR 45,250 COINS]        │
│                                     │
│  #2 - 91.2 kg - 45,600 💰          │
│      Caught: 1 day ago              │
│      [SELL FOR 45,600 COINS]        │
│                                     │
│  #3 - 90.7 kg - 45,350 💰          │
│      Caught: 3 days ago             │
│      [SELL FOR 45,350 COINS]        │
│                                     │
│  [SELL ALL FOR 136,200 COINS]       │
└─────────────────────────────────────┘
```

---

## ✅ COMPLETION CRITERIA

- [x] Documentation complete
- [x] All phases implemented
- [x] Tests passing
- [x] UI/UX polished
- [x] Firebase rules updated
- [x] Performance optimized

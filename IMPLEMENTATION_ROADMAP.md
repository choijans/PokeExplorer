# 🎮 POKEEXPLORER IMPLEMENTATION ROADMAP

## 📋 PHASE 1: AR IMPROVEMENTS + LEVEL SYSTEM

### Step 1.1: Catch Quality System ✅
- [x] Track average tension during minigame
- [x] Track time in zone percentage  
- [x] Calculate quality: Nice/Great/Excellent
- [x] Display quality badge on success
- [x] Award bonus XP based on quality

### Step 1.2: Visual Effects ✅
- [x] Particle effects on catch success
- [x] Ball wobble animation
- [x] Screen shake on success/failure

### Step 1.3: Escape Mechanic ✅
- [x] Pokemon escapes permanently on break free
- [x] No retry button
- [x] Player loses chance to capture

### Step 1.4: Player Level System ✅
- [x] Create level/XP system
- [x] Store player level in Firebase
- [x] Display level in profile
- [x] XP requirements per level
- [x] Catch quality bonuses (Nice +25, Great +50, Excellent +100)
- [ ] Level up rewards (future enhancement)

---

## 📋 PHASE 2: SHOP SYSTEM ✅

### Step 2.1: Shop Spawn System ✅
- [x] Shops spawn within 100m of player
- [x] Spawn check every 2 minutes (30% chance)
- [x] Max 3 shops at a time
- [x] Shops despawn after 15 minutes
- [x] 4 shop types: Mart, Berry, General, Premium

### Step 2.2: Shop Items ✅
**Pokeballs:**
- [x] Poke Ball (100 coins)
- [x] Great Ball (300 coins)
- [x] Ultra Ball (800 coins)
- [x] Master Ball (5000 coins - premium only)

**Berries:**
- [x] Razz Berry (50 coins)
- [x] Nanab Berry (50 coins)
- [x] Pinap Berry (100 coins)
- [x] Golden Razz (200 coins - premium only)

**Items:**
- [x] Incense (500 coins)
- [x] Lucky Egg (800 coins - premium only)
- [x] Star Piece (800 coins - premium only)

### Step 2.3: Shop UI ✅
- [x] Shop icons on map (🏪🍓💎🏬)
- [x] Shop modal with item list
- [x] Purchase with coin deduction
- [x] Inventory auto-update

### Step 2.4: Currency System ✅
- [x] Coins from selling Pokemon
- [x] Shop purchases deduct coins
- [x] Insufficient funds alert
- [ ] Daily login bonus (future)
- [ ] Level up rewards (future)

---

## 🗄️ FIREBASE SCHEMA UPDATES

### Current Schema
```
users/
  {uid}/
    inventory/
    collection/
    stats/
    coins/
    caughtInstances/
    discoveries/
```

### New Schema Additions
```
users/
  {uid}/
    level: number
    xp: number
    totalXP: number
    coins: number
    activeEffects/
      incense: { active: boolean, expiresAt: timestamp }
      luckyEgg: { active: boolean, expiresAt: timestamp }
      starPiece: { active: boolean, expiresAt: timestamp }

shops/
  {shopId}/
    location: { latitude, longitude }
    items: { itemId: { price, stock } }
    spawnedAt: timestamp
    expiresAt: timestamp
```

---

## 🔒 FIREBASE RULES UPDATES

### Current Rules Issues:
1. No level/XP validation
2. No shop read access
3. No activeEffects structure

### Required Changes:
```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        "level": {
          ".validate": "newData.isNumber() && newData.val() >= 1 && newData.val() <= 100"
        },
        "xp": {
          ".validate": "newData.isNumber() && newData.val() >= 0"
        },
        "totalXP": {
          ".validate": "newData.isNumber() && newData.val() >= 0"
        },
        "coins": {
          ".validate": "newData.isNumber() && newData.val() >= 0"
        },
        "activeEffects": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "collection": {
          "$pokemonId": {
            ".indexOn": ["count", "lastCapturedAt"],
            "captures": {
              ".indexOn": ["capturedAt"]
            }
          }
        },
        "inventory": {
          ".validate": "newData.hasChildren()"
        },
        "caughtInstances": {
          ".indexOn": ["capturedAt", "pokemonId"]
        },
        "discoveries": {
          ".indexOn": ["count"]
        },
        "stats": {
          ".validate": "newData.hasChildren(['totalCaptured', 'uniqueCaptured'])"
        }
      }
    },
    "shops": {
      ".read": "auth != null",
      "$shopId": {
        ".write": false,
        ".indexOn": ["expiresAt", "spawnedAt"]
      }
    },
    "community": {
      "posts": {
        ".read": true,
        ".write": "auth != null",
        "$postId": {
          ".read": true,
          ".write": "auth != null"
        }
      },
      "leaderboard": {
        ".read": true,
        "$uid": {
          ".write": "$uid === auth.uid",
          ".indexOn": ["level", "totalXP"]
        }
      }
    }
  }
}
```

---

## 📝 IMPLEMENTATION ORDER

### NOW (Phase 1):
1. ✅ Update Firebase rules
2. ✅ Create level service
3. ✅ Add XP tracking to captures
4. ✅ Display level in profile
5. ✅ Add catch quality system
6. ✅ Add particle effects
7. ✅ Remove retry on escape

### NEXT (Phase 2):
8. ✅ Create shop service
9. ✅ Shop spawn logic
10. ✅ Shop UI components
11. ✅ Purchase system
12. ⏳ Active effects system (future enhancement)

---

## 🎯 LEVEL SYSTEM DETAILS

### XP Requirements (Exponential Growth)
```
Level 1: 0 XP
Level 2: 100 XP
Level 3: 250 XP
Level 4: 500 XP
Level 5: 1000 XP
...
Formula: XP = 100 * (level - 1)^1.5
```

### XP Sources
- Base catch: 100 XP
- Nice throw: +25 XP
- Great throw: +50 XP
- Excellent throw: +100 XP
- First catch of species: +500 XP
- Evolution: +200 XP
- Berry used: +10 XP

### Level Rewards
- Every level: 20 Poke Balls
- Every 5 levels: 10 Great Balls
- Every 10 levels: 5 Ultra Balls + 1000 coins
- Level 20: Master Ball
- Level 40: Special item

---

## 🏪 SHOP SYSTEM DETAILS

### Shop Types
1. **Poke Mart** - Pokeballs only
2. **Berry Shop** - Berries only
3. **General Store** - Mixed items
4. **Premium Shop** - Rare items (Master Ball, Golden Razz)

### Spawn Logic
- Check player location every 2 minutes
- If < 3 shops nearby, 30% chance to spawn
- Spawn 50-100m from player
- Random shop type (Premium = 5% chance)
- Despawn after 15 minutes

### Shop Interaction
- Tap shop icon on map
- Opens shop UI
- Browse items
- Purchase with coins
- Items added to inventory

---

## ✅ READY TO START?

Run these steps in order:
1. Update Firebase rules (copy from above)
2. Implement level service
3. Add XP to capture flow
4. Update UI to show level
5. Add catch quality tracking
6. Add visual effects
7. Remove retry button

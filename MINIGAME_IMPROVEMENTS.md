# 🎮 MINIGAME IMPROVEMENTS PLAN

## ✅ COMPLETED TASKS

### Phase 1: Rarity System
- [x] Check if rarity system exists in Pokemon data
- [x] Implement rarity calculation based on Pokemon ID/stats
- [x] Add rarity-based difficulty modifiers

### Phase 2: UI Adjustments
- [x] Change tension bar from vertical to horizontal
- [x] Change control from tap to hold
- [x] Make indicator movement smoother
- [x] Adjust sweet spot size based on rarity

### Phase 3: Difficulty Scaling
- [x] Common Pokemon: Fast progress (+3/tick), large sweet spot (40%)
- [x] Uncommon Pokemon: Normal progress (+2/tick), medium sweet spot (30%)
- [x] Rare Pokemon: Slow progress (+1.5/tick), small sweet spot (25%)
- [x] Epic Pokemon: Very slow progress (+1/tick), tiny sweet spot (20%)
- [x] Legendary Pokemon: Extremely slow (+0.5/tick), minimal sweet spot (15%)

### Phase 4: Visual Feedback
- [x] Show rarity indicator on screen
- [x] Color-code difficulty (green=easy, yellow=medium, orange=hard, red=very hard, purple=legendary)
- [x] Adjust announcer messages based on rarity

## 🎯 RARITY CALCULATION LOGIC

Based on Pokemon base stats total:
- **Common**: 0-399 total stats (Pidgey, Rattata, Caterpie)
- **Uncommon**: 400-499 total stats (Pikachu, Eevee, Growlithe)
- **Rare**: 500-579 total stats (Arcanine, Gyarados, Dragonite)
- **Epic**: 580-669 total stats (Pseudo-legendaries)
- **Legendary**: 670+ total stats (Mewtwo, Rayquaza, Arceus)

## 🎨 NEW UI LAYOUT

```
┌─────────────────────────────────────┐
│     KEEP IN THE ZONE! (RARE)        │
├─────────────────────────────────────┤
│                                     │
│  ◄═══════[████]═══════►             │
│         Sweet Spot                  │
│                                     │
│  [▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░] 50%        │
│                                     │
│  HOLD SCREEN TO MOVE RIGHT          │
└─────────────────────────────────────┘
```

## 🔧 TECHNICAL CHANGES

1. **Horizontal Bar**: Width-based positioning instead of height
2. **Hold Mechanic**: onPressIn/onPressOut instead of onPress
3. **Smooth Movement**: Smaller increment steps (0.5-1 per tick)
4. **Drift**: Slower automatic drift left (1-2 per tick)
5. **Rarity Colors**: Common=green, Uncommon=blue, Rare=purple, Epic=orange, Legendary=gold

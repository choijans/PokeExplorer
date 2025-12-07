# Capture Minigame Fix - COMPLETED ✅

## Issues to Fix
1. ❌ Progress breaks free immediately when not holding
2. ❌ Indicator should start centered and stay there briefly
3. ❌ Sweet spot should move randomly to increase difficulty

## Implementation Tasks

### Task 1: Fix Initial State ✅
- [x] Start indicator at center (50%)
- [x] Start progress at neutral (50%)
- [x] Add grace period before progress decay starts

### Task 2: Fix Progress Decay ✅
- [x] Don't let progress drop below 0 immediately
- [x] Slower decay rate when not holding (0.15 instead of 0.3)
- [x] Only fail if progress stays at 0 for 2+ seconds (40 ticks)

### Task 3: Add Sweet Spot Movement ✅
- [x] Sweet spot moves randomly left/right
- [x] Movement speed based on rarity (0.3 to 1.5)
- [x] Movement range: 20% - 80% of bar
- [x] Random direction changes

### Task 4: Balance Gameplay ✅
- [x] Adjust progress gain/loss rates
- [x] Make it possible to win without perfect play
- [x] Increase difficulty for rare Pokemon

## Expected Behavior ✅
- Indicator starts at 50% (center)
- Progress starts at 50%
- User holds screen → indicator moves right, progress increases if in zone
- User releases → indicator moves left, progress decreases slowly (0.15/tick)
- Sweet spot moves randomly to challenge player (speed varies by rarity)
- Capture succeeds at 100% progress
- Capture fails only after 2 seconds at 0% progress

## Implementation Complete

### Changes Made:
1. **Initial Progress**: Starts at 50% instead of 0%
2. **Decay Rate**: Reduced from 0.3 to 0.15 per tick
3. **Failure Condition**: Must stay at 0% for 40 ticks (2 seconds) before failing
4. **Sweet Spot Movement**: 
   - Moves randomly within 20%-80% range
   - Speed varies by rarity (0.3 for common, 1.5 for legendary)
   - Random direction changes (2%-6% chance per tick)
5. **Difficulty Scaling**: Rarer Pokemon have faster moving targets

# AR CAPTURE SCREEN REDESIGN - POKEMON STYLE

## ✅ IMPLEMENTATION CHECKLIST

### Phase 1: UI Structure ✅
- [x] Split bottom panel into CAPTURE/ITEMS tabs
- [x] Pokemon-style card layout for balls/berries
- [x] Biome background images

### Phase 2: Enhanced UI/UX 🔄
- [ ] Add tab icons (Pokeball icon for CAPTURE, Berry icon for ITEMS)
- [ ] Smooth tab switching animation
- [ ] Pokemon idle breathing animation
- [ ] Capture difficulty indicator/mood bar
- [ ] Rounded command window styling
- [ ] Ball effectiveness labels ("Standard", "High Capture Rate")
- [ ] Item tooltips with effect descriptions
- [ ] "THROW BALL" button with glow animation
- [ ] "USE ITEM" button with confirmation

### Phase 3: Throw Animation Sequence 🔄
- [ ] Camera zoom on throw
- [ ] Ball arc trajectory from bottom-right
- [ ] Flash effect when ball hits Pokemon
- [ ] Pokemon shrink-into-ball animation
- [ ] Ball drop to ground with bounce
- [ ] Classic click + suction sound effect

### Phase 4: Pokeball Shake Animation 🔄
- [ ] Ball shake sequence (3 shakes)
- [ ] Metallic bounce sound per shake
- [ ] Glow pulse from ball button
- [ ] Movement blur effect
- [ ] Screen dim during shake

### Phase 5: Fisch-Style Minigame 🔄
- [ ] Vertical tension bar UI
- [ ] Moving capture indicator (slider)
- [ ] Sweet spot zone (green highlight)
- [ ] Tap/hold controls for indicator movement
- [ ] Dynamic sweet spot (moves/shrinks based on difficulty)
- [ ] Progress meter (circular arc)
- [ ] Progress fills when in sweet zone
- [ ] Progress drains when outside zone
- [ ] Ball shake sync with indicator position
- [ ] Ball glow when perfectly centered
- [ ] Ball jolt when slider exits zone

### Phase 6: Capture Result Animations 🔄
- [ ] Success: Ball sparkle + fly up + close tight
- [ ] Success: "Gotcha!" banner
- [ ] Success: Victory music transition
- [ ] Failure: Pop sound + flash
- [ ] Failure: Pokemon burst out animation
- [ ] Failure: Ball break/roll away
- [ ] Failure: Pokemon angry/taunt animation

### Phase 7: Polish & Feedback 🔄
- [ ] Battle announcer text box
- [ ] Dynamic messages ("You used a Great Ball!", "Almost had it!")
- [ ] Camera shake on escape
- [ ] Dust particles on ball impact
- [ ] UI sound effects (bag rustle, cursor beep, item jingle)
- [ ] Pokemon occasional blink animation
- [ ] Area-specific backdrop variations

## 🎯 CURRENT IMPLEMENTATION PRIORITY

**NOW IMPLEMENTING:**
1. Enhanced tab UI with icons
2. Pokemon breathing animation
3. Throw animation sequence
4. Fisch-style minigame core mechanics
5. Capture result animations

## 📝 TECHNICAL NOTES

### Animations Required
- `breatheAnim` - Pokemon idle breathing
- `tabSlideAnim` - Tab switching
- `throwArcAnim` - Ball trajectory
- `ballShakeAnim` - Pokeball shake sequence
- `indicatorAnim` - Minigame slider movement
- `progressAnim` - Capture progress meter
- `burstAnim` - Pokemon escape effect

### New Components Needed
- `CaptureMinigame` - Fisch-style tension bar
- `AnnouncerTextBox` - Battle messages
- `ThrowButton` - Glowing throw button
- `ProgressMeter` - Circular capture progress

### Assets Needed
- Tab icons (Pokeball, Berry)
- Sound effects (throw, shake, success, fail)
- Particle effects (sparkle, dust, flash)

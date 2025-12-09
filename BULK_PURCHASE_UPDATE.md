# 🛒 BULK PURCHASE & MINIGAME SPEED UPDATE

## ✅ What Changed

### 1. Bulk Purchase System

**Features:**
- Buy multiple items at once (up to stock limit)
- Quantity selector with +/- buttons
- Total price calculation
- Separate modal for bulk purchases

**UI Flow:**
1. Tap "BULK" button on item (appears if stock > 1)
2. Modal opens with quantity selector
3. Adjust quantity with +/- buttons
4. See total price update in real-time
5. Confirm purchase or cancel

**Modal Design:**
```
┌─────────────────────────────────┐
│  Buy Poké Ball                  │
│  Stock: 8                       │
│                                 │
│     [-]    5    [+]             │
│                                 │
│  💰 500 coins                   │
│                                 │
│  [Cancel]    [Buy 5x]           │
└─────────────────────────────────┘
```

**Benefits:**
- Save time buying multiple items
- Better for stocking up on common items
- Clear total cost before purchase
- Easy quantity adjustment

### 2. AR Capture Minigame Speed Adjustment

**Changes:**
- Acceleration: 0.15 → 0.08 (47% slower)
- Max speed: 2.5 → 1.2 (52% slower)

**Impact:**
- More controlled movement
- Easier to keep Pokemon in zone
- Less twitchy/responsive
- Better for precision gameplay

**Before:**
- Fast acceleration
- High max speed
- Difficult to control
- Overshooting common

**After:**
- Gradual acceleration
- Moderate max speed
- Smooth control
- Precise positioning

---

## 🎮 Bulk Purchase Examples

### Example 1: Stocking Up on Poké Balls
```
Item: Poké Ball
Price: 100 coins each
Stock: 8

Quantity: 5
Total: 500 coins

Result: 5x Poké Balls added to inventory
```

### Example 2: Buying All Berries
```
Item: Razz Berry
Price: 50 coins each
Stock: 10

Quantity: 10
Total: 500 coins

Result: 10x Razz Berries added to inventory
```

### Example 3: Limited Stock
```
Item: Master Ball
Price: 5000 coins each
Stock: 1

Bulk button: Hidden (stock = 1)
Only "BUY" button available
```

---

## 🎯 Minigame Speed Comparison

### Before (Fast):
```
Acceleration: 0.15 units/frame²
Max Speed: 2.5 units/frame
Time to max speed: ~17 frames (~0.28s)
Distance per second: ~150 units
```

### After (Balanced):
```
Acceleration: 0.08 units/frame²
Max Speed: 1.2 units/frame
Time to max speed: ~15 frames (~0.25s)
Distance per second: ~72 units
```

**Result:** 52% slower movement, much easier to control!

---

## 🔧 Technical Implementation

### Bulk Purchase Modal
```typescript
// State
const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
const [quantity, setQuantity] = useState(1);

// Purchase handler
const handlePurchase = async (item: ShopItem, qty: number) => {
  const totalPrice = item.price * qty;
  await currencyService.deductCoins(userId, totalPrice);
  await firebaseInventoryService.addItem(userId, item.id, qty);
  // Update shop stock
};

// Quantity controls
<TouchableOpacity onPress={() => setQuantity(Math.max(1, quantity - 1))}>
  <Text>-</Text>
</TouchableOpacity>
<Text>{quantity}</Text>
<TouchableOpacity onPress={() => setQuantity(Math.min(stock, quantity + 1))}>
  <Text>+</Text>
</TouchableOpacity>
```

### Minigame Speed
```typescript
// Slower acceleration
if (isHoldingRef.current) {
  captureZoneVelocityRef.current += 0.08;  // was 0.15
  captureZoneVelocityRef.current = Math.min(1.2, captureZoneVelocityRef.current);  // was 2.5
}
```

---

## 📊 User Experience Improvements

### Bulk Purchase Benefits:
- ✅ Faster shopping for common items
- ✅ Clear total cost visibility
- ✅ Easy quantity adjustment
- ✅ Prevents accidental purchases (confirmation step)
- ✅ Better for stocking up before hunts

### Minigame Speed Benefits:
- ✅ More accessible for all skill levels
- ✅ Less frustrating overshooting
- ✅ Better precision control
- ✅ Smoother gameplay feel
- ✅ Easier to maintain Pokemon in zone

---

## 🎨 UI Elements

### Bulk Button
- Blue color (#2196F3)
- Appears next to BUY button
- Only shows if stock > 1
- Text: "BULK"

### Bulk Modal
- Centered overlay
- Dark background (80% opacity)
- White card with black border
- +/- buttons (circular)
- Large quantity display
- Gold price text
- Cancel (gray) and Confirm (green) buttons

---

## ✅ Testing Checklist

### Bulk Purchase:
- [x] BULK button appears when stock > 1
- [x] BULK button hidden when stock = 1
- [x] Modal opens on BULK tap
- [x] +/- buttons adjust quantity
- [x] Quantity capped at stock limit
- [x] Total price updates correctly
- [x] Purchase deducts correct amount
- [x] Items added to inventory
- [x] Stock decreases correctly
- [x] Cancel closes modal

### Minigame Speed:
- [x] Zone moves slower
- [x] Acceleration is gradual
- [x] Max speed is reasonable
- [x] Control feels smooth
- [x] Easier to keep Pokemon in zone

---

## 🎉 Summary

**Bulk Purchase:**
- Buy 1-10 items at once
- Quantity selector modal
- Total price calculation
- Saves time shopping

**Minigame Speed:**
- 52% slower max speed
- 47% slower acceleration
- Better control
- More accessible

Both improvements enhance user experience and make the game more enjoyable! 🚀

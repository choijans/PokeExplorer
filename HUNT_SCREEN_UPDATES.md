# Hunt Screen Updates - Complete

## Changes Made

### 1. UI Improvements ✅
- Replaced all emoji icons with React Native Paper icons
- Updated styling to match app's consistent design language
- Used Card, Chip, IconButton, FAB components
- Improved visual hierarchy and spacing
- Better color scheme matching other screens

### 2. Shop Integration ✅
- Added shop modal to Hunt Screen
- Shop refreshes every 5 minutes (300,000ms)
- FAB menu with Shop and Map navigation
- Shop items available for purchase
- Stock management integrated

### 3. Push Notifications ✅
- Shop refresh notifications (local + scheduled)
- Rare Pokemon spawn notifications
- Permission handling for Android 13+
- Background notification support

## Required Dependencies

Add these to your `package.json`:

```json
{
  "dependencies": {
    "@notifee/react-native": "^7.8.0"
  }
}
```

## Installation Steps

### Step 1: Install Dependencies
```bash
npm install @notifee/react-native
# or
yarn add @notifee/react-native
```

### Step 2: iOS Setup (if targeting iOS)
```bash
cd ios
pod install
cd ..
```

### Step 3: Android Setup
No additional setup needed for Android. Notifee works out of the box.

### Step 4: Update AndroidManifest.xml
Add notification permission (already in most RN projects):

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

## Features

### Shop System
- **Location**: Hunt Screen → FAB Menu → Shop
- **Refresh**: Every 5 minutes
- **Notifications**: Push notification when shop refreshes
- **Items**: Pokeballs, Berries, Lures, XP Boosters
- **Stock**: Limited stock per refresh

### Notifications
1. **Shop Refresh**
   - Triggers every 5 minutes
   - Shows even when app is in background
   - Tapping opens the app

2. **Rare Pokemon**
   - Triggers when rare/legendary spawns
   - Shows Pokemon name and distance
   - Tapping opens the app

### UI Components Used
- `Card` - Container for sections
- `Chip` - Tags and filters
- `IconButton` - Action buttons
- `FAB.Group` - Floating action menu
- `Portal` - Overlay management

## Icon Replacements

| Old Emoji | New Icon | Component |
|-----------|----------|-----------|
| 🗺️ | map | IconButton |
| 🔄 | refresh | IconButton |
| 📍 | map-marker | IconButton |
| 🌍 | earth | Chip |
| 📏 | map-marker-distance | Chip |
| ⭐ | pokeball | Chip |
| ℹ️ | information | Chip |
| 🏪 | store | FAB |

## Testing

### Test Shop
1. Open Hunt Screen
2. Tap FAB menu (bottom right)
3. Tap "Shop"
4. Purchase items
5. Wait 5 minutes for refresh notification

### Test Notifications
1. Grant notification permission
2. Wait for rare Pokemon spawn
3. Check notification appears
4. Wait 5 minutes for shop refresh
5. Check notification appears

### Test UI
1. Switch between Map and List views
2. Check all icons render correctly
3. Verify no emojis remain
4. Check styling matches other screens

## Troubleshooting

### Notifications Not Showing
- Check permission granted
- Verify Android 13+ has POST_NOTIFICATIONS permission
- Check notification channel created
- Ensure app has background permission

### Shop Not Appearing
- Verify user is logged in
- Check shop service generating items
- Verify ShopModal component imported
- Check FAB menu renders

### Icons Not Showing
- Verify react-native-paper installed
- Check icon names are correct
- Ensure theme provider wraps app

## File Changes

### Modified
1. `src/screens/HuntScreen.tsx` - Complete UI overhaul
2. `src/services/shopService.ts` - Already existed
3. `src/components/ShopModal.tsx` - Already existed

### Created
1. `src/services/notificationService.ts` - Push notification service

## Next Steps

1. Install @notifee/react-native
2. Test notifications on device
3. Customize notification sounds/icons
4. Add notification action buttons
5. Implement notification history

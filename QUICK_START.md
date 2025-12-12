# Quick Start Guide

## Installation (Required)

```bash
npm install @notifee/react-native
```

For iOS:
```bash
cd ios && pod install && cd ..
```

## What Changed

### Hunt Screen
- ✅ All emojis replaced with icons
- ✅ Shop accessible via FAB menu
- ✅ Push notifications enabled
- ✅ UI matches app design

### Shop
- **Access:** Hunt Screen → FAB (bottom right) → Shop
- **Refresh:** Every 5 minutes
- **Notification:** Yes, push notification when refreshed

### Notifications
- **Shop Refresh:** Every 5 minutes
- **Rare Pokemon:** When rare/legendary spawns
- **Permission:** Auto-requested on launch

## Testing

1. Install dependency: `npm install @notifee/react-native`
2. Run app
3. Grant notification permission
4. Open Hunt Screen
5. Tap FAB → Shop
6. Wait 5 minutes for notification

## Files Changed

- `src/screens/HuntScreen.tsx` - UI + Shop + Notifications
- `src/services/notificationService.ts` - NEW

## Icon Replacements

- 🗺️ → `map` icon
- 🔄 → `refresh` icon
- 📍 → `map-marker` icon
- 🌍 → `earth` icon
- ⭐ → `pokeball` icon
- 🏪 → `store` icon

## Done!

Everything is ready. Just install the dependency and test!

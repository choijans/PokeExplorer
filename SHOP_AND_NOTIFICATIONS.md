# Shop & Notifications - Quick Reference

## ✅ What's New

### Shop Access
- **MapScreen:** FAB button (store icon) on right side
- **HuntScreen:** FAB menu → Shop option

### Notifications
- **Type:** Professional push notifications (not popups)
- **Shop Refresh:** Every 5 minutes
- **Rare Pokemon:** When spawned nearby
- **Background:** Works when app is closed

## 📦 Installation

```bash
npm install @notifee/react-native
cd ios && pod install && cd ..  # iOS only
```

## 🎯 Features

### Shop
- ✅ Accessible in both MapScreen and HuntScreen
- ✅ Auto-refresh every 5 minutes
- ✅ Push notification on refresh
- ✅ Full purchase system
- ✅ Stock management

### Notifications
- ✅ System notification tray (not in-app alerts)
- ✅ Background support
- ✅ Scheduled notifications
- ✅ Notification channels
- ✅ Cross-platform (iOS + Android)

## 🧪 Testing

1. Install: `npm install @notifee/react-native`
2. Run app
3. Grant notification permission
4. Open MapScreen → Tap store icon
5. Wait 5 minutes for notification
6. Check notification tray (not in-app)

## 📱 User Experience

**Before:**
- Alert popups (blocking)
- Shop only in HuntScreen
- No background notifications

**After:**
- Professional push notifications
- Shop in both screens
- Background notifications
- Better UX

## ✨ Done!

Everything is ready. Just install the dependency and test!

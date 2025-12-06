# Hunt Screen Troubleshooting Guide

## Issue: Hunt Screen Crashes on Open

### Quick Fixes

#### 1. Check React Native Logs
When testing on your phone, connect it to your computer and check the logs:

**iOS:**
```bash
npx react-native log-ios
```

**Android:**
```bash
npx react-native log-android
```

Look for error messages that appear when you tap the Hunt tab.

#### 2. Verify Location Permissions

**iOS:**
- Go to Settings > Privacy & Security > Location Services
- Find "PokeExplorer"
- Ensure it's set to "While Using the App"

**Android:**
- Go to Settings > Apps > PokeExplorer > Permissions
- Enable Location permission

#### 3. Common Crash Causes & Solutions

##### A. Maps Module Not Loaded
**Symptom:** App crashes immediately when opening Hunt screen

**Solution:** The app now has a fallback! If maps don't load, it shows a list view instead. If you're still seeing crashes, check the console for the specific error.

##### B. Location Permission Denied
**Symptom:** App shows "Unable to get your location" or crashes when requesting permission

**Solution:**
1. Uninstall the app
2. Reinstall it
3. When prompted for location permission, tap "Allow"

##### C. Geolocation Service Error
**Symptom:** Error message about geolocation timeout

**Solution:**
- Ensure location services are enabled on your device
- Try testing outdoors or near a window for better GPS signal
- The timeout is set to 15 seconds, so wait a bit

##### D. Android Google Maps API Key Missing
**Symptom:** Map shows but is blank/gray

**Solution:**
Add Google Maps API key to `android/app/src/main/AndroidManifest.xml`:
```xml
<application>
  <meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="YOUR_API_KEY_HERE"/>
  ...
</application>
```

#### 4. Test with Debug Mode

Add this to see what's happening:

1. Open the Hunt screen
2. Check your terminal/console for these log messages:
   - "Requesting location permission..."
   - "Permission result: true/false"
   - "Getting current location..."
   - "Location: {latitude, longitude}"
   - "Generating encounters..."
   - "Loading Pokemon data..."

If any of these don't appear, that's where the crash is happening.

#### 5. Rebuild the App

Sometimes native modules need a clean rebuild:

**iOS:**
```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
npm run ios
```

**Android:**
```bash
cd android
./gradlew clean
cd ..
npm run android
```

#### 6. Check for Missing Dependencies

Verify all packages are installed:
```bash
npm install
```

Then rebuild for your platform.

### Fallback Mode

The Hunt screen now has a **fallback list view** that works even if maps fail to load. This shows:
- Your current coordinates
- List of nearby Pokemon
- Distance to each Pokemon
- Ability to tap and catch them

This ensures the Hunt feature works even if there are map issues!

### Still Crashing?

If none of the above works, please provide:
1. The exact error message from the logs
2. Your device type (iPhone/Android model)
3. OS version
4. Whether you're using a physical device or simulator

### Emergency Workaround

If you need to demo the app but Hunt keeps crashing, you can temporarily disable it:

Edit `src/navigation/BottomTabNavigator.tsx` and comment out the Hunt screen:
```typescript
// <Tab.Screen
//   name="Hunt"
//   component={HuntScreen}
//   options={{
//     tabBarLabel: 'Hunt',
//     tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>🗺️</Text>,
//   }}
// />
```

This will hide the Hunt tab until you fix the issue.

## Expected Behavior

When working correctly:
1. Tap Hunt tab
2. See "Searching for Pokemon..." loading screen
3. Permission prompt appears (first time only)
4. Map loads showing your location (blue dot)
5. Red markers appear for nearby Pokemon
6. Tap markers to encounter and catch Pokemon
7. Caught Pokemon turn green

## Debug Checklist

- [ ] Location services enabled on device
- [ ] App has location permission
- [ ] Internet connection active (for loading Pokemon data)
- [ ] GPS signal available (try outdoors)
- [ ] Console shows no errors
- [ ] Maps module loaded (or fallback list appears)
- [ ] Pokemon data loading successfully

## Contact

If you're still stuck, share:
- Console logs
- Device info
- Screenshots of the error

Good luck! 🎮

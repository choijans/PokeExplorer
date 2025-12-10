# Splash Screen Setup - PokeExplorer

## Overview
A complete splash screen implementation for both iOS and Android using the favicon.png as the logo with a beautiful gradient background matching the app theme.

## Generated Assets

### iOS Splash Screens (in `assets/splash/`)
- `splash-1290x2796.png` - iPhone 14 Pro Max, 13 Pro Max, 12 Pro Max
- `splash-1179x2556.png` - iPhone 14 Pro, 13 Pro, 12 Pro
- `splash-1170x2532.png` - iPhone 14, 13, 12
- `splash-1242x2688.png` - iPhone 11 Pro Max, XS Max
- `splash-1125x2436.png` - iPhone 11 Pro, X, XS
- `splash-828x1792.png` - iPhone 11, XR
- `splash-1242x2208.png` - iPhone 8 Plus, 7 Plus, 6s Plus
- `splash-750x1334.png` - iPhone 8, 7, 6s, 6
- `splash-2048x2732.png` - iPad Pro 12.9"
- `splash-1668x2388.png` - iPad Pro 11"

### Android Splash Screens (in `assets/splash/`)
- `splash-xxxhdpi.png` (1440x2560) - 4x density
- `splash-xxhdpi.png` (1080x1920) - 3x density
- `splash-xhdpi.png` (720x1280) - 2x density
- `splash-hdpi.png` (480x800) - 1.5x density
- `splash-mdpi.png` (320x480) - 1x density

### React Native Component
- `src/screens/SplashScreen.tsx` - Animated splash screen with fade-in and scale effects

## Implementation Details

### iOS
✅ **LaunchScreen.storyboard** - Updated with SplashIcon image centered on gradient background
✅ **Images.xcassets/SplashIcon.imageset/** - Contains favicon.png at 1x, 2x, and 3x scales
✅ Native splash displays instantly on app launch

### Android
✅ **SplashActivity.java** - Dedicated splash activity that launches MainActivity
✅ **AndroidManifest.xml** - Updated to use SplashActivity as launcher with SplashTheme
✅ **drawable/splash_screen.xml** - Gradient background with centered splash icon
✅ **values/styles.xml** - SplashTheme style for native splash screen
✅ **mipmap-*/splash_icon.png** - Favicon copied to all density folders (mdpi to xxxhdpi)

### React Native
✅ **AppNavigator.tsx** - Shows SplashScreen component during auth loading state
✅ Smooth transition from native splash to React Native splash

## Theme Colors
- Gradient Start: `#63A4FF` (secondary blue)
- Gradient End: `#83EAF1` (tertiary cyan)
- Matches the app's Pokémon theme perfectly

## How It Works

### App Launch Flow
1. **Native Splash** (iOS/Android)
   - Displays immediately when app icon is tapped
   - Shows favicon logo on gradient background
   - No loading delay - instant visual feedback

2. **React Native Splash** (During Auth Check)
   - Displays while checking Firebase authentication
   - Animated fade-in and scale effect
   - Smooth transition to login or main app

3. **Main App**
   - User proceeds to LoginScreen or BottomTabNavigator
   - Splash is dismissed with fade-out animation

## Regenerating Assets

If you need to update the splash screens (e.g., new logo), run:

```bash
cd assets
/opt/homebrew/bin/python3 generate_splash.py
```

This will regenerate all splash screens using the current `favicon.png`.

## Files Modified/Created

### New Files
- `src/screens/SplashScreen.tsx`
- `assets/generate_splash.py`
- `ios/PokeExplorer/LaunchScreen.storyboard`
- `ios/PokeExplorer/Images.xcassets/SplashIcon.imageset/`
- `android/app/src/main/java/com/pokeexplorer/SplashActivity.java`
- `android/app/src/main/res/drawable/splash_screen.xml`
- `android/app/src/main/res/values/styles.xml`
- `android/app/src/main/res/mipmap-*/splash_icon.png` (all densities)
- `assets/splash/*.png` (15 splash screen variations)

### Modified Files
- `src/navigation/AppNavigator.tsx` - Integrated SplashScreen component
- `android/app/src/main/AndroidManifest.xml` - Added SplashActivity configuration

## Testing

### iOS
```bash
npx react-native run-ios
```
You should see:
1. Native splash (gradient + logo) instantly on launch
2. React Native splash with animation during auth check
3. Smooth transition to login/main screen

### Android
```bash
npx react-native run-android
```
You should see:
1. Native splash (gradient + logo) from SplashActivity
2. Immediate transition to MainActivity
3. React Native splash during auth check
4. Smooth transition to login/main screen

## Customization

To customize the splash screen:

1. **Change Logo**: Replace `assets/icon/favicon.png` and rerun generator
2. **Change Colors**: Edit `GRADIENT_START` and `GRADIENT_END` in `generate_splash.py`
3. **Animation Duration**: Modify timing in `SplashScreen.tsx` (currently 2 seconds)
4. **Logo Size**: Adjust `width * 0.4` in `SplashScreen.tsx` styles

## Dependencies

- `react-native-linear-gradient` - For gradient backgrounds (already in project)
- `Pillow` (Python) - For generating splash images

## Notes

- All splash images use the favicon.png as the central logo
- Gradient matches the app's theme colors (#63A4FF to #83EAF1)
- iOS splash uses storyboard for dynamic device support
- Android splash uses a separate activity for instant display
- React Native splash provides smooth transitions and animations

## Troubleshooting

**iOS splash not showing:**
- Clean build folder in Xcode
- Verify SplashIcon exists in Images.xcassets
- Check LaunchScreen.storyboard is set as launch screen

**Android splash not showing:**
- Verify SplashActivity is set as launcher in AndroidManifest.xml
- Check drawable/splash_screen.xml exists
- Clean and rebuild: `cd android && ./gradlew clean`

**React Native splash not showing:**
- Check if SplashScreen is imported in AppNavigator.tsx
- Verify loading state triggers splash display
- Check console for any import errors

# UI Library Installation

## Install Dependencies

```bash
npm install
```

## Android Setup (Vector Icons)

Add to `android/app/build.gradle`:

```gradle
apply from: file("../../node_modules/react-native-vector-icons/fonts.gradle")
```

## iOS Setup (Vector Icons)

```bash
cd ios
pod install
cd ..
```

## Run the App

```bash
# Android
npm run android

# iOS
npm run ios
```

## What Changed

### New Libraries
- **react-native-paper** (5.12.3) - Material Design components
- **react-native-vector-icons** (10.0.3) - Icon library

### Refactored Screens
1. **MapScreen** - Now uses FAB buttons, Cards, and Chips
2. **ARCaptureScreen** - Uses Paper Buttons, Chips, and IconButtons
3. **SocialScreen** - Uses SegmentedButtons, Cards, and modern inputs

### Fixed Issues
- **Storage cleanup** - Prevents "disk full" errors
- **Cache size reduced** - From 100 to 50 items, 6hr expiry
- **Auto cleanup** - Runs on map screen focus

### UI Improvements
- Material Design 3 theme
- Pokemon-themed colors (Red primary, Gold secondary)
- Better icons (GPS, pokeball, timer, etc.)
- Cleaner cards and buttons
- Improved spacing and elevation

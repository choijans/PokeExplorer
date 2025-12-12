## PokeExplorer

**Tasklist** - We can see our agile tasklist here in this excel file:  
https://docs.google.com/spreadsheets/d/1Y9Zb_5j-wa5wDPFKQ87AU3PoXpO0bJIyC440ac4fwYc/edit?usp=sharing

PokeExplorer is a React Native mobile app that lets you hunt, discover, and collect Pokémon in the real world. It combines geolocation, an AR-inspired capture minigame, a Pokédex, and a community feed for sharing discoveries.

The project is built with:

- React Native **0.73.9** (JavaScript/TypeScript)
- React Navigation for multi-screen navigation
- Firebase (Auth, Realtime Database, Messaging)
- Geolocation & map tiles (OpenStreetMap)
- React Native Vision Camera and related camera/microphone libraries

> React Native was intentionally pinned to **0.73.9** to avoid compatibility issues with several required libraries (see "Development Challenges & Solutions" below).

---

## 1. Prerequisites

Make sure your environment is set up for React Native 0.73.x.

### Global tools

- Node.js (LTS recommended)
- npm (comes with Node) or Yarn
- Git
- Java JDK 17 (for Android builds)
- Android Studio with Android SDK & emulator tools (for Android)
- Xcode (for iOS; macOS only)
- Ruby + Bundler (for CocoaPods on iOS)

> If you haven't set up React Native before, follow the official guide: https://reactnative.dev/docs/environment-setup (React Native CLI / React Native 0.73).

---

## 2. Project Setup

From the project root (`PokeExplorer/`):

1. **Install JavaScript dependencies**

     ```sh
     # Using npm
     npm install

     # OR using Yarn
     # yarn
     ```

2. **Install iOS native dependencies (macOS only)**

     From the `ios/` directory:

     ```sh
     cd ios
     bundle install          # first time only, installs CocoaPods via Bundler
     bundle exec pod install # every time native deps change
     cd ..
     ```

3. **Configure environment variables / API keys**

     - Firebase configuration is already checked in (`android/app/google-services.json`, `ios/GoogleService-Info.plist`).
     - Map tiles use OpenStreetMap instead of Google Maps, so no paid API key is required.

---

## 3. Running the App

### 3.1 Start Metro (JavaScript bundler)

From the project root:

```sh
npm start
```

Leave this terminal running while you build and run the app.

### 3.2 Run on Android

In a new terminal, from the project root:

```sh
npm run android
```

Notes:

- Ensure an Android emulator is running **or** a physical Android device is connected with USB debugging enabled and authorized.
- On some school/lab PCs, emulators may have network restrictions; using a physical device with mobile data can be more reliable (see challenges below).

### 3.3 Run on iOS (macOS only)

In a new terminal, from the project root:

```sh
npm run ios
```

Notes:

- Requires Xcode and CocoaPods to be properly installed.
- If you see pod or build errors, try:
    - Cleaning derived data in Xcode / via `rm -rf ~/Library/Developer/Xcode/DerivedData/PokeExplorer-*`
    - Re-running `cd ios && bundle exec pod install && cd ..`
- As of this project, the iOS build still required additional configuration on some machines (see challenges below). Android was treated as the primary, stable target.

---

## 4. Key Dependencies

This project relies on several React Native libraries and native modules, including (non-exhaustive):

- **Core**
    - `react-native` **0.73.9**
    - `@react-navigation/*` for navigation
- **Firebase**
    - `@react-native-firebase/app`
    - `@react-native-firebase/auth`
    - `@react-native-firebase/database`
    - `@react-native-firebase/messaging`
- **Location & Maps**
    - Geolocation services for player position
    - OpenStreetMap tiles for the hunt map view
- **Camera & AR**
    - `react-native-vision-camera` (for AR-style capture)
    - Additional libraries for microphone and camera permissions
- **UI / Utilities**
    - React Native Paper components
    - AsyncStorage-based services for caching and persistence

> When upgrading dependencies, keep React Native at 0.73.9 unless you have verified that geolocation, AR, microphone, and camera packages all support the newer version.

---

## 5. Development Challenges & Solutions

This project encountered several real-world constraints and platform issues during development. Below is a summary of the most important ones and how they were addressed.

### 5.1 Compatibility issues with the latest React Native version

**Problem:** Using the newest version of React Native caused multiple compatibility errors with key packages (geolocation, ViroReact, microphone access, React Native Vision Camera, etc.). Development became slow and unstable.

**Solution:** The team downgraded React Native to **0.73.9**, which is fully compatible with the required libraries. After downgrading, the project built more reliably and development speed improved significantly.

---

### 5.2 Emulator network issues on school computers

**Problem:** On school lab PCs, both Android and iOS emulators failed to load Pokémon data from the external API due to network connection errors. This made it impossible to test certain features using the emulators.

**Solution:** Developer options and USB debugging were enabled on real mobile phones, and those physical devices were connected for testing. Using actual phones (with personal mobile data) allowed the app to reach the Pokémon API successfully and restored the ability to test all features.

---

### 5.3 Google Maps API restrictions

**Problem:** Google Maps requires an API key that, in practice, needed a credit card to register. This was not feasible for the group, so Google Maps could not be used.

**Solution:** The project switched to **OpenStreetMap**, a free alternative that does not require payment. OpenStreetMap became the backing map provider for the hunt mode map view.

---

### 5.4 Difficulty building the iOS version

**Problem:** Building the iOS app (both on simulator and physical devices) was significantly harder than Android. Various configuration and dependency issues caused frequent build failures and consumed substantial time.

**Solution:** Android was prioritized as the main target platform to keep progress steady. The iOS build remained partially unresolved and would require further platform-specific configuration and troubleshooting beyond the project scope.

---

### 5.5 Difficulty setting up the computer lab PC

**Problem:** One team member could not get their assigned lab PC to build the project, despite multiple configuration attempts. This prevented them from contributing effectively from that machine.

**Solution:** The team switched to another lab PC that was already correctly configured and working. Using the known-good workstation removed the blocker and allowed development to continue smoothly.

---

## 6. Troubleshooting Tips

- If the app fails to fetch Pokémon data on emulators, try a physical device with mobile data.
- If iOS builds fail after dependency changes:
    - Clean derived data
    - Re-run `bundle exec pod install` inside `ios/`
    - Ensure Xcode and CocoaPods are up to date
- If Android builds fail:
    - Check that Android SDK, platform tools, and JDK versions match React Native 0.73 requirements
    - Run a clean build from Android Studio if needed

---

## 7. Learn More

To learn more about React Native itself:

- React Native Website: https://reactnative.dev
- Environment Setup: https://reactnative.dev/docs/environment-setup
- Learn the Basics: https://reactnative.dev/docs/getting-started
- Blog: https://reactnative.dev/blog
- GitHub repo for React Native: https://github.com/facebook/react-native

For this project specifically, see the in-code documentation and comments in:

- `App.tsx` and `src/navigation/` for navigation structure
- `src/screens/` for individual feature screens (Pokedex, Hunt, Collection, Community, Profile)
- `src/services/` for API, Firebase, and storage logic

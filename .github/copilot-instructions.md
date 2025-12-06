# PokeExplorer AI guide

## Architecture snapshot
- `App.tsx` wraps the app with `PaperProvider`, `SafeAreaProvider`, and `AuthProvider` before loading `NavigationContainer`; `src/navigation/AppNavigator.tsx` owns the root stack and flips between `LoginScreen` and the signed-in tabs based on Firebase auth state.
- The bottom bar lives in `src/navigation/BottomTabNavigator.tsx` (Pokedex, Hunt, Collection, Community, Profile). Detail and AR routes are stacked above the tabs; update both `RootStackParamList` and `TabParamList` when adding screens.

## Data and service layer
- Pokedex data flows through `src/services/pokeApi.ts`, which caches JSON in both memory and `AsyncStorage`, retries fetches three times, and exposes helpers like `searchPokemon` and `getTypeColor`. Call these instead of issuing raw fetches to keep caching consistent.
- Captured Pokémon persist via `src/services/discoveryService.ts` (AsyncStorage). `HuntScreen` and `ARCaptureScreen` depend on `discoveryService.addDiscoveredPokemon` to mark catches; keep IDs unique and reuse the helper when adding new capture entry points.
- Geo encounters come from `src/services/locationService.ts`; `generatePokemonEncounters`, `calculateDistance`, and `getBiomeFromLocation` underpin both `HuntScreen` and `MapScreen`. Reuse these utilities rather than reimplementing distance math or biome rules.
- Community content is mediated by `src/services/communityService.ts`, wrapping Firebase Realtime Database nodes (`community/posts`, `community/comments`, `users`). Use the service methods so likes, comment counts, and auth checks stay coherent.

## UI conventions
- Shared layout primitives (`Screen`, `SectionCard`) live in `src/components/ui/`; compose new screens with them to inherit gradients, spacing, and safe-area handling.
- Theme tokens are defined in `src/theme/index.ts` (`pokemonTheme`). Access spacing, radius, and gradients via `useTheme<PokemonTheme>()` instead of hard-coded numbers.
- Images flow through `LazyImage` (`src/components/LazyImage.tsx`) and `imageCacheService`, which preload sprites and fade them in. Prefer these over raw `Image` for Pokémon art to keep caching/styling consistent.

## Feature flows to respect
- `PokedexList` wires text + voice search (`@react-native-voice/voice`) and conditionally falls back when voice isn't available. Extend voice UX by updating `setupVoiceRecognition` and the permission helpers (`requestMicrophonePermission`).
- `HuntScreen` watches GPS updates, generates biome-based encounters, and only allows capture when `locationService.calculateDistance(...) < 100`. After successful capture, `ARCaptureScreen` records the Pokémon via `discoveryService` and the collection reloads from storage—keep these hooks in sync if you tweak the range or storage schema.
- `CommunityFeedScreen` relies on the realtime listener (`communityService.onFeedUpdate`) plus modal dialogs for CRUD. For new post metadata, extend the service so list updates remain real-time.

## Developer workflows
- Use `npm start` (or `yarn start`) for Metro, then `npm run android` / `npm run ios` to install the native app. On iOS, run `bundle install && bundle exec pod install` inside `ios/` whenever native deps change.
- Lint with `npm run lint` (configured via `@react-native/eslint-config`), and run Jest with `npm test` (preset already targets React Native; mock Firebase to avoid auth hangs).
- Native troubleshooting: `cd android && ./gradlew clean` clears Android builds; `rm -rf Podfile.lock Pods && pod install` refreshes iOS pods (both commands are already used in this repo).

## Integration watch-outs
- Firebase credentials are committed (`android/app/google-services.json`, `ios/GoogleService-Info.plist`), and modules register through `src/config/firebase.ts`; ensure new Firebase features import there to initialize natively.
- `MapScreen` pulls Stadia Maps tiles with an embedded API key—respect rate limits and keep calls centralized.
- `react-native-vision-camera` in `ARCaptureScreen` requires camera permission strings in native manifests; preserve the permission gating logic before accessing the camera.
- `AuthContext` (`src/contexts/AuthContext.tsx`) assumes an auth state change subscription; when writing tests or storybook-like setups, supply a mock provider to prevent the app from stalling on the loading screen.

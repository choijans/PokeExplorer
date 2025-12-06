# Quick Setup Guide

## ✅ Android (Works Now)

```bash
# Install packages
npm install

# Add vector icons to android/app/build.gradle:
apply from: file("../../node_modules/react-native-vector-icons/fonts.gradle")

# Run
npm run android
```

## ⚠️ iOS (Ruby 3.4 Issue)

CocoaPods doesn't support Ruby 3.4 yet. **Options:**

### Option 1: Use System Ruby (Recommended)
```bash
# Use macOS system Ruby 2.6
/usr/bin/ruby --version  # Should show 2.6.x
cd ios
/usr/bin/gem install bundler
/usr/bin/bundle install
/usr/bin/bundle exec pod install
cd ..
npm run ios
```

### Option 2: Install Ruby 3.1 via rbenv
```bash
brew install rbenv
rbenv install 3.1.4
rbenv local 3.1.4
cd ios
bundle install
bundle exec pod install
cd ..
npm run ios
```

### Option 3: Skip iOS for now
Just use Android until CocoaPods supports Ruby 3.4

## What's New

- ✅ React Native Paper UI library
- ✅ Material Design 3 components
- ✅ Vector icons (GPS, pokeball, timer, etc.)
- ✅ Fixed cache/storage issues
- ✅ All features working on Android

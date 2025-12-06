# iOS Fix - Install Xcode Command Line Tools

## The Issue
CocoaPods needs to compile native extensions, which requires Xcode Command Line Tools.

## Quick Fix

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Then run pod install
cd ios
export LANG=en_US.UTF-8
export PATH="/Users/user/.gem/ruby/2.6.0/bin:$PATH"
bundle install
bundle exec pod install
cd ..

# Run iOS
npm run ios
```

## For Now: Use Android

```bash
npm run android
```

All features work on Android! iOS just needs the command line tools installed.

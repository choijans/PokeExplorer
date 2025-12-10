#!/usr/bin/env python3
"""
Generate splash screen assets for iOS and Android using favicon.png
Run: python3 generate_splash.py
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FAVICON_PATH = os.path.join(SCRIPT_DIR, 'icon', 'favicon.png')
SPLASH_DIR = os.path.join(SCRIPT_DIR, 'splash')
IOS_ASSETS_DIR = os.path.join(SCRIPT_DIR, '..', 'ios', 'PokeExplorer', 'Images.xcassets')
ANDROID_RES_DIR = os.path.join(SCRIPT_DIR, '..', 'android', 'app', 'src', 'main', 'res')

# Theme colors (from your theme)
BACKGROUND_COLOR = '#FFFFFF'  # Pure white background

# Ensure directories exist
os.makedirs(SPLASH_DIR, exist_ok=True)

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def create_solid_background(width, height):
    """Create a solid white background"""
    bg_color = hex_to_rgb(BACKGROUND_COLOR)
    image = Image.new('RGB', (width, height), bg_color)
    return image

def generate_splash(width, height, filename):
    """Generate a splash screen with solid white background and centered logo"""
    print(f"Generating {filename} ({width}x{height})...")
    
    # Create solid background
    splash = create_solid_background(width, height)
    
    # Load and resize favicon
    try:
        logo = Image.open(FAVICON_PATH)
        
        # Calculate logo size (30% of screen width, maintaining aspect ratio)
        logo_width = int(width * 0.3)
        aspect_ratio = logo.height / logo.width
        logo_height = int(logo_width * aspect_ratio)
        
        logo = logo.resize((logo_width, logo_height), Image.Resampling.LANCZOS)
        
        # Calculate position to center logo
        logo_x = (width - logo_width) // 2
        logo_y = (height - logo_height) // 2 - int(height * 0.1)  # Slightly above center
        
        # Paste logo onto splash (handle transparency)
        if logo.mode == 'RGBA':
            splash.paste(logo, (logo_x, logo_y), logo)
        else:
            splash.paste(logo, (logo_x, logo_y))
        
    except Exception as e:
        print(f"Warning: Could not load favicon.png: {e}")
    
    # Save splash screen
    output_path = os.path.join(SPLASH_DIR, filename)
    splash.save(output_path, 'PNG', quality=95)
    print(f"✓ Saved: {output_path}")
    
    return splash

def generate_ios_splashes():
    """Generate iOS splash screens for various device sizes"""
    print("\n=== Generating iOS Splash Screens ===")
    
    ios_sizes = [
        # iPhone 14 Pro Max, 13 Pro Max, 12 Pro Max
        (1290, 2796, 'splash-1290x2796.png'),
        # iPhone 14 Pro, 13 Pro, 12 Pro
        (1179, 2556, 'splash-1179x2556.png'),
        # iPhone 14, 13, 12
        (1170, 2532, 'splash-1170x2532.png'),
        # iPhone 11 Pro Max, XS Max
        (1242, 2688, 'splash-1242x2688.png'),
        # iPhone 11 Pro, X, XS
        (1125, 2436, 'splash-1125x2436.png'),
        # iPhone 11, XR
        (828, 1792, 'splash-828x1792.png'),
        # iPhone 8 Plus, 7 Plus, 6s Plus
        (1242, 2208, 'splash-1242x2208.png'),
        # iPhone 8, 7, 6s, 6
        (750, 1334, 'splash-750x1334.png'),
        # iPad Pro 12.9"
        (2048, 2732, 'splash-2048x2732.png'),
        # iPad Pro 11"
        (1668, 2388, 'splash-1668x2388.png'),
    ]
    
    for width, height, filename in ios_sizes:
        generate_splash(width, height, filename)

def generate_android_splashes():
    """Generate Android splash screens for various densities"""
    print("\n=== Generating Android Splash Screens ===")
    
    android_sizes = [
        # xxxhdpi (4x)
        (1440, 2560, 'splash-xxxhdpi.png'),
        # xxhdpi (3x)
        (1080, 1920, 'splash-xxhdpi.png'),
        # xhdpi (2x)
        (720, 1280, 'splash-xhdpi.png'),
        # hdpi (1.5x)
        (480, 800, 'splash-hdpi.png'),
        # mdpi (1x)
        (320, 480, 'splash-mdpi.png'),
    ]
    
    for width, height, filename in android_sizes:
        generate_splash(width, height, filename)

def create_ios_launchscreen():
    """Create LaunchScreen.storyboard configuration"""
    print("\n=== Creating iOS LaunchScreen Configuration ===")
    
    storyboard_content = '''<?xml version="1.0" encoding="UTF-8"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0" toolsVersion="21701" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none" useAutolayout="YES" launchScreen="YES" useTraitCollections="YES" useSafeAreas="YES" colorMatched="YES" initialViewController="01J-lp-oVM">
    <device id="retina6_12" orientation="portrait" appearance="light"/>
    <dependencies>
        <deployment identifier="iOS"/>
        <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="21679"/>
        <capability name="Safe area layout guides" minToolsVersion="9.0"/>
        <capability name="documents saved in the Xcode 8 format" minToolsVersion="8.0"/>
    </dependencies>
    <scenes>
        <!--View Controller-->
        <scene sceneID="EHf-IW-A2E">
            <objects>
                <viewController id="01J-lp-oVM" sceneMemberID="viewController">
                    <view key="view" contentMode="scaleToFill" id="Ze5-6b-2t3">
                        <rect key="frame" x="0.0" y="0.0" width="393" height="852"/>
                        <autoresizingMask key="autoresizingMask" widthSizable="YES" heightSizable="YES"/>
                        <subviews>
                            <imageView clipsSubviews="YES" userInteractionEnabled="NO" contentMode="scaleAspectFit" horizontalHuggingPriority="251" verticalHuggingPriority="251" image="SplashIcon" translatesAutoresizingMaskIntoConstraints="NO" id="tWc-Dq-wcI">
                                <rect key="frame" x="96.666666666666686" y="326" width="200" height="200"/>
                                <constraints>
                                    <constraint firstAttribute="width" constant="200" id="sQ6-vd-cdH"/>
                                    <constraint firstAttribute="height" constant="200" id="sXC-aj-JKL"/>
                                </constraints>
                            </imageView>
                        </subviews>
                        <viewLayoutGuide key="safeArea" id="Bcu-3y-fUS"/>
                        <color key="backgroundColor" red="1" green="1" blue="1" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>
                        <constraints>
                            <constraint firstItem="tWc-Dq-wcI" attr="centerX" secondItem="Ze5-6b-2t3" secondAttribute="centerX" id="5cz-MP-9tL"/>
                            <constraint firstItem="tWc-Dq-wcI" attr="centerY" secondItem="Ze5-6b-2t3" secondAttribute="centerY" id="gQL-YQ-ZLX"/>
                        </constraints>
                    </view>
                </viewController>
                <placeholder placeholderIdentifier="IBFirstResponder" id="iYj-Kq-Ea1" userLabel="First Responder" sceneMemberID="firstResponder"/>
            </objects>
            <point key="canvasLocation" x="52.671755725190835" y="374.64788732394368"/>
        </scene>
    </scenes>
    <resources>
        <image name="SplashIcon" width="200" height="200"/>
    </resources>
</document>
'''
    
    launchscreen_path = os.path.join(SCRIPT_DIR, '..', 'ios', 'PokeExplorer', 'LaunchScreen.storyboard')
    with open(launchscreen_path, 'w') as f:
        f.write(storyboard_content)
    print(f"✓ Created: {launchscreen_path}")

def create_android_splash_drawable():
    """Create Android splash drawable XML"""
    print("\n=== Creating Android Splash Drawable ===")
    
    splash_xml = '''<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Background pure white -->
    <item>
        <shape android:shape="rectangle">
            <solid android:color="#FFFFFF" />
        </shape>
    </item>
    
    <!-- Logo centered -->
    <item>
        <bitmap
            android:gravity="center"
            android:src="@mipmap/splash_icon" />
    </item>
</layer-list>
'''
    
    drawable_dir = os.path.join(ANDROID_RES_DIR, 'drawable')
    os.makedirs(drawable_dir, exist_ok=True)
    
    splash_path = os.path.join(drawable_dir, 'splash_screen.xml')
    with open(splash_path, 'w') as f:
        f.write(splash_xml)
    print(f"✓ Created: {splash_path}")

def copy_splash_icon_to_android():
    """Copy favicon as splash icon to Android mipmap folders"""
    print("\n=== Copying Splash Icon to Android ===")
    
    try:
        logo = Image.open(FAVICON_PATH)
        
        densities = {
            'mdpi': 48,
            'hdpi': 72,
            'xhdpi': 96,
            'xxhdpi': 144,
            'xxxhdpi': 192,
        }
        
        for density, size in densities.items():
            mipmap_dir = os.path.join(ANDROID_RES_DIR, f'mipmap-{density}')
            os.makedirs(mipmap_dir, exist_ok=True)
            
            resized = logo.resize((size, size), Image.Resampling.LANCZOS)
            output_path = os.path.join(mipmap_dir, 'splash_icon.png')
            resized.save(output_path, 'PNG')
            print(f"✓ Created: {output_path}")
            
    except Exception as e:
        print(f"Error copying splash icon: {e}")

def create_android_styles():
    """Create Android styles.xml for splash screen"""
    print("\n=== Creating Android Styles ===")
    
    styles_xml = '''<resources>
    <!-- Base application theme. -->
    <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
        <!-- Customize your theme here. -->
        <item name="android:textColor">#000000</item>
    </style>

    <!-- Splash Screen Theme -->
    <style name="SplashTheme" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="android:windowBackground">@drawable/splash_screen</item>
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowActionBar">false</item>
        <item name="android:windowFullscreen">true</item>
        <item name="android:windowContentOverlay">@null</item>
    </style>
</resources>
'''
    
    values_dir = os.path.join(ANDROID_RES_DIR, 'values')
    os.makedirs(values_dir, exist_ok=True)
    
    styles_path = os.path.join(values_dir, 'styles.xml')
    with open(styles_path, 'w') as f:
        f.write(styles_xml)
    print(f"✓ Created: {styles_path}")

def main():
    """Main function to generate all splash screen assets"""
    print("PokeExplorer Splash Screen Generator")
    print("=" * 50)
    
    if not os.path.exists(FAVICON_PATH):
        print(f"Error: favicon.png not found at {FAVICON_PATH}")
        return
    
    # Generate splash screens
    generate_ios_splashes()
    generate_android_splashes()
    
    # Create configuration files
    create_ios_launchscreen()
    create_android_splash_drawable()
    copy_splash_icon_to_android()
    create_android_styles()
    
    print("\n" + "=" * 50)
    print("✅ All splash screen assets generated successfully!")
    print("\nNext steps:")
    print("1. iOS: Splash screens are in assets/splash/ - add them to Images.xcassets")
    print("2. Android: Splash drawable and icon are configured in res/")
    print("3. Update AndroidManifest.xml to use SplashTheme for splash activity")
    print("4. Add SplashScreen component to your app navigation for smooth transition")

if __name__ == '__main__':
    main()

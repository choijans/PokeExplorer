#!/usr/bin/env python3
"""
Generate Android adaptive icon foreground layers from favicon.png.
For adaptive icons, we need a separate foreground layer (transparent background)
that the system will composite over the background color.

Run: python3 generate_adaptive_icons.py
"""
from PIL import Image, ImageOps
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FAVICON_PATH = os.path.join(SCRIPT_DIR, 'icon', 'favicon.png')
ANDROID_RES_DIR = os.path.join(SCRIPT_DIR, '..', 'android', 'app', 'src', 'main', 'res')

# Adaptive icon foreground should be 108x108dp with the actual icon centered in 72x72dp safe zone
# The outer 18dp on each side can be clipped
sizes = {
    'mdpi': 108,    # 108dp @ 1x = 108px
    'hdpi': 162,    # 108dp @ 1.5x = 162px
    'xhdpi': 216,   # 108dp @ 2x = 216px
    'xxhdpi': 324,  # 108dp @ 3x = 324px
    'xxxhdpi': 432, # 108dp @ 4x = 432px
}

if not os.path.exists(FAVICON_PATH):
    print(f"favicon.png not found at {FAVICON_PATH}")
    raise SystemExit(1)

logo = Image.open(FAVICON_PATH).convert('RGBA')

for density, size in sizes.items():
    mipmap_dir = os.path.join(ANDROID_RES_DIR, f'mipmap-{density}')
    os.makedirs(mipmap_dir, exist_ok=True)

    # Create adaptive icon foreground (108dp with icon centered in 72dp safe zone)
    # The icon should occupy about 66% of the total area to leave padding
    safe_zone_size = int(size * 0.66)  # ~72dp out of 108dp
    
    # Resize logo to fit in safe zone
    logo_resized = logo.copy()
    logo_resized.thumbnail((safe_zone_size, safe_zone_size), Image.Resampling.LANCZOS)
    
    # Create transparent background
    foreground = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    
    # Center the logo
    x = (size - logo_resized.width) // 2
    y = (size - logo_resized.height) // 2
    foreground.paste(logo_resized, (x, y), logo_resized)
    
    # Save as ic_launcher_foreground.png
    out_path = os.path.join(mipmap_dir, 'ic_launcher_foreground.png')
    foreground.save(out_path, format='PNG')
    print(f"Created: {out_path}")

print('\n✅ Adaptive icon foreground layers generated!')
print('Note: Update mipmap-anydpi-v26/ic_launcher.xml to use @mipmap/ic_launcher_foreground')
#!/usr/bin/env python3
"""
Generate Android launcher icons (square ic_launcher and circular ic_launcher_round)
from assets/icon/favicon.png and place them into android mipmap folders.
Run: /opt/homebrew/bin/python3 generate_launcher_icons.py
"""
from PIL import Image, ImageOps
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FAVICON_PATH = os.path.join(SCRIPT_DIR, 'icon', 'favicon.png')
ANDROID_RES_DIR = os.path.join(SCRIPT_DIR, '..', 'android', 'app', 'src', 'main', 'res')

sizes = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192,
}

if not os.path.exists(FAVICON_PATH):
    print(f"favicon.png not found at {FAVICON_PATH}")
    raise SystemExit(1)

logo = Image.open(FAVICON_PATH).convert('RGBA')

for density, size in sizes.items():
    mipmap_dir = os.path.join(ANDROID_RES_DIR, f'mipmap-{density}')
    os.makedirs(mipmap_dir, exist_ok=True)

    # Square launcher icon
    square = logo.copy()
    square = ImageOps.contain(square, (size, size))
    # If not exact size, center on transparent background
    if square.size != (size, size):
        bg = Image.new('RGBA', (size, size), (0,0,0,0))
        x = (size - square.width)//2
        y = (size - square.height)//2
        bg.paste(square, (x,y), square)
        square = bg
    out_square = os.path.join(mipmap_dir, 'ic_launcher.png')
    square.save(out_square, format='PNG')
    print(f"Created: {out_square}")

    # Round launcher icon (circular mask)
    fg = square.copy()
    mask = Image.new('L', (size, size), 0)
    draw = Image.new('RGBA', (size, size))
    # create circular mask
    from PIL import ImageDraw
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse((0,0,size,size), fill=255)
    rounded = Image.new('RGBA', (size, size), (0,0,0,0))
    rounded.paste(fg, (0,0), mask)
    out_round = os.path.join(mipmap_dir, 'ic_launcher_round.png')
    rounded.save(out_round, format='PNG')
    print(f"Created: {out_round}")

print('\n✅ Launcher icons generated and placed into mipmap folders.')

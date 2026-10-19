#!/usr/bin/env python3
"""Build cropped, small square WebP tiles from the curated original photographs.
Run after Vite has copied public/* into dist/.
"""
from pathlib import Path
from PIL import Image, ImageOps

ROOT=Path(__file__).resolve().parents[1]
TARGET=ROOT/'dist'/'menu-tiles'
TARGET.mkdir(parents=True,exist_ok=True)
count=total_orig=total_new=0
for folder in ('media','menu-assets'):
    for path in sorted((ROOT/'public'/folder).glob('*.webp')):
        with Image.open(path) as original:
            im=ImageOps.fit(original.convert('RGB'),(240,240),
                method=Image.Resampling.LANCZOS,centering=(0.5,0.5))
            dest=TARGET/path.name
            im.save(dest,'WEBP',quality=67,method=6)
        count+=1
        total_orig+=path.stat().st_size
        total_new+=dest.stat().st_size
        if dest.stat().st_size>25000:
            raise RuntimeError(f'Tile is too large: {dest} ({dest.stat().st_size} bytes)')
if count<38:
    raise RuntimeError(f'Missing curated source photographs: expected 38, found {count}')
print(f'Menu tiles: {count} cropped 240x240 WebP images, {total_orig//1024} KiB → {total_new//1024} KiB')

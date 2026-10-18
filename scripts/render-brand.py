"""Raster preview of the same vector primitives shipped in the Android icon."""
import json
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
mark = json.loads((root / 'assets/brand/shizhen-icon.json').read_text(encoding='utf-8'))
size, oversample = 512, 4
factor = size * oversample / mark['size']
image = Image.new('RGBA', (size * oversample, size * oversample))
draw = ImageDraw.Draw(image)
draw.rounded_rectangle((0, 0, image.width - 1, image.height - 1), radius=24 * factor, fill='black')
for dial in mark['dials']:
    x, y, radius = (dial[key] * factor for key in ('x', 'y', 'radius'))
    draw.ellipse((x-radius, y-radius, x+radius, y+radius), outline=(97, 97, 97), width=round(.85*factor))
    width = round(mark['handWidth'] * factor)
    for end in dial['ends']:
        ex, ey = (value * factor for value in end)
        draw.line((x,y,ex,ey),fill='white',width=width)
        for cx,cy in ((x,y),(ex,ey)):
            draw.ellipse((cx-width/2,cy-width/2,cx+width/2,cy+width/2),fill='white')
image.resize((size,size),Image.Resampling.LANCZOS).save(root / 'assets/brand/shizhen.png')
image.resize((192,192),Image.Resampling.LANCZOS).save(root / 'assets/brand/shizhen-preview.png')

"""TaskLens P0-6: bundled SAMPLE photo for Mock Device Kit.

A synthetic under-sink scene (cabinet, P-trap, drip + puddle) so mock captures
are real JPEG bytes instead of empty arrays. Labeled "sample / mock" in-app;
never presented as a user photo.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import random

W, H = 1280, 960
random.seed(7)

img = Image.new("RGB", (W, H), (24, 20, 16))
d = ImageDraw.Draw(img)

# Cabinet back wall gradient + vignette
for y in range(H):
    t = y / H
    d.line([(0, y), (W, y)], fill=(int(38 + 30 * t), int(32 + 24 * t), int(26 + 18 * t)))
# Side walls
d.polygon([(0, 0), (180, 120), (180, H), (0, H)], fill=(30, 25, 20))
d.polygon([(W, 0), (W - 180, 120), (W - 180, H), (W, H)], fill=(30, 25, 20))
# Floor boards
for i in range(6):
    y0 = 640 + i * 55
    d.line([(0, y0), (W, y0)], fill=(18, 14, 11), width=4)

# Drain tailpiece from top
d.rectangle([590, 60, 690, 420], fill=(150, 150, 155))
d.rectangle([590, 60, 620, 420], fill=(185, 185, 190))
# P-trap curve
d.arc([520, 340, 760, 620], start=0, end=180, fill=(150, 150, 155), width=100)
d.arc([520, 340, 760, 620], start=0, end=180, fill=(190, 190, 195), width=34)
# Trap arm to wall
d.rectangle([690, 480, 1100, 560], fill=(150, 150, 155))
d.rectangle([690, 480, 1100, 500], fill=(188, 188, 193))
# Slip-joint nuts
for x0 in (575, 675):
    d.rectangle([x0, 400, x0 + 130, 460], fill=(110, 110, 116))

# Water stain on wall behind trap
d.ellipse([480, 560, 800, 900], fill=(52, 44, 32))
d.ellipse([540, 620, 740, 840], fill=(62, 52, 36))

# Drip + puddle under the trap joint
for i in range(3):
    dx = 640 + random.randint(-8, 8)
    dy = 640 + i * 60 + random.randint(0, 20)
    d.ellipse([dx - 7, dy - 12, dx + 7, dy + 12], fill=(140, 180, 210))
puddle = [500, 860, 800, 930]
d.ellipse(puddle, fill=(70, 100, 130))
d.ellipse([540, 878, 760, 912], fill=(120, 165, 200))
d.ellipse([580, 886, 700, 904], fill=(170, 205, 230))  # specular

# Grain noise
px = img.load()
for _ in range(9000):
    x, y = random.randrange(W), random.randrange(H)
    r, g, b = px[x, y]
    n = random.randint(-14, 14)
    px[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)))

out = Path(__file__).resolve().parents[2] / "apps" / "glasses-android" / "app" / "src" / "main" / "res" / "raw"
out.mkdir(parents=True, exist_ok=True)
img.save(out / "sample_leak.jpg", quality=88)
print("wrote", out / "sample_leak.jpg", img.size)

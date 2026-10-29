"""TaskLens P0-5: generate PWA icons + Play store graphics with Pillow.

Design tokens (AGENTS/P0-3): Ink #0F1B2D, Paper #FAF7F2, safety orange #F26A1B,
trust green #0E9F6E. Glyph = camera-lens ring (orange) with a white spark cut.
Outputs are committed; rerun:  python scripts/gen-pwa-assets.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

INK = (15, 27, 45, 255)
PAPER = (250, 247, 242, 255)
ORANGE = (242, 106, 27, 255)
GREEN = (14, 159, 110, 255)
WHITE = (255, 255, 255, 255)

ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / "public" / "icons"
STORE = ROOT.parents[1] / "docs" / "store"


def font(size: int):
    try:
        return ImageFont.load_default(size=size)
    except TypeError:  # old Pillow: bitmap font only
        return ImageFont.load_default()


def rounded(bg_size: int, radius: int) -> Image.Image:
    img = Image.new("RGBA", (bg_size, bg_size), (0, 0, 0, 0))
    mask = Image.new("L", (bg_size, bg_size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, bg_size, bg_size], radius=radius, fill=255)
    solid = Image.new("RGBA", (bg_size, bg_size), INK)
    img.paste(solid, (0, 0), mask)
    return img


def lens(draw: ImageDraw.ImageDraw, cx: float, cy: float, r: float, ring: float) -> None:
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=ORANGE, width=int(ring))
    draw.ellipse([cx - r * 0.52, cy - r * 0.52, cx + r * 0.52, cy + r * 0.52],
                 outline=WHITE, width=max(2, int(ring * 0.55)))
    # spark: small orange dot upper-right inside the ring
    sr = r * 0.16
    draw.ellipse([cx + r * 0.30 - sr, cy - r * 0.44 - sr, cx + r * 0.30 + sr, cy - r * 0.44 + sr],
                 fill=ORANGE)


def app_icon(size: int, maskable: bool) -> Image.Image:
    img = Image.new("RGBA", (size, size), INK) if maskable else rounded(size, int(size * 0.225))
    d = ImageDraw.Draw(img)
    # Maskable safe zone: keep the glyph inside the central ~66%.
    r = size * (0.26 if maskable else 0.30)
    lens(d, size / 2, size / 2, r, ring=size * 0.055)
    return img


def feature_graphic() -> Image.Image:
    w, h = 1024, 500
    img = Image.new("RGBA", (w, h), INK)
    d = ImageDraw.Draw(img)
    lens(d, 190, h / 2, 120, ring=24)
    x = 360
    d.text((x, 120), "TaskLens", font=font(104), fill=WHITE)
    # Stick to ASCII: the bundled bitmap font has no "·" or accented glyphs.
    d.text((x + 4, 268), "Mira - Habla - Reserva - Verifica", font=font(44), fill=ORANGE)
    d.text((x + 4, 336), "Tu reparacion, cotizada en segundos.", font=font(36), fill=PAPER)
    return img


def main() -> None:
    ICONS.mkdir(parents=True, exist_ok=True)
    STORE.mkdir(parents=True, exist_ok=True)
    app_icon(192, False).save(ICONS / "icon-192.png")
    app_icon(512, False).save(ICONS / "icon-512.png")
    app_icon(512, True).save(ICONS / "maskable-512.png")
    app_icon(512, False).save(STORE / "icon-512.png")
    feature_graphic().convert("RGB").save(STORE / "feature-1024x500.png")
    for p in sorted([*ICONS.iterdir(), *STORE.iterdir()]):
        print(p, Image.open(p).size)


if __name__ == "__main__":
    main()

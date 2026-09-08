"""Launcher icons: a monogram on the brand colour, one set per client flavour."""
import os
from PIL import Image, ImageDraw, ImageFont

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SIZES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
SS = 4

CLIENTS = {
    "akanan": ("A", (22, 38, 94), (201, 242, 63)),
    "viosk":  ("V", (22, 38, 94), (201, 242, 63)),
}

def icon(letter, bg, ink, size, round_icon):
    n = size * SS
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if round_icon:
        d.ellipse([0, 0, n - 1, n - 1], fill=bg + (255,))
    else:
        d.rounded_rectangle([0, 0, n - 1, n - 1], radius=int(n * 0.22), fill=bg + (255,))
    target = n * 0.52
    fs = int(target)
    for _ in range(24):
        f = ImageFont.truetype(FONT, fs)
        l, t, r, b = d.textbbox((0, 0), letter, font=f)
        h = b - t
        if h == 0: break
        sc = target / h
        if 0.99 <= sc <= 1.01: break
        fs = max(8, int(fs * sc))
    f = ImageFont.truetype(FONT, fs)
    l, t, r, b = d.textbbox((0, 0), letter, font=f)
    d.text((n/2 - (l+r)/2, n/2 - (t+b)/2), letter, font=f, fill=ink + (255,))
    return img.resize((size, size), Image.LANCZOS)

root = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "android", "app", "src")
for flavour, (letter, bg, ink) in CLIENTS.items():
    for dpi, px in SIZES.items():
        out = os.path.join(root, flavour, "res", "mipmap-" + dpi)
        os.makedirs(out, exist_ok=True)
        icon(letter, bg, ink, px, False).save(os.path.join(out, "ic_launcher.png"))
        icon(letter, bg, ink, px, True).save(os.path.join(out, "ic_launcher_round.png"))
    print(flavour, "->", letter)

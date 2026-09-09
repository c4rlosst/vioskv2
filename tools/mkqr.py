"""
Table cards: one QR per store, on that shop's own colours.

    pip install qrcode pillow
    python3 tools/mkqr.py [base-url]

Writes qr/ at the repo root: a print-ready A6 card and a bare QR per store,
plus a combined PDF. Pass a different base URL as the first argument if the
site moves -- every printed card dies when the domain changes, so claim the
domain you want before printing.

STORES must match the database. Get the tokens with:

    select b.name, s.name, s.qr_token from stores s
      join businesses b on b.id = s.business_id;
"""
import os
import sys
import qrcode
from qrcode.constants import ERROR_CORRECT_H
from PIL import Image, ImageDraw, ImageFont

BASE = sys.argv[1] if len(sys.argv) > 1 else "https://ordertaker-tan.vercel.app"

BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
if os.name == "nt":  # same faces ship with Windows under different names
    BOLD = r"C:\Windows\Fonts\segoeuib.ttf"
    REG = r"C:\Windows\Fonts\segoeui.ttf"

# business, store, token, brand, accent, accent_ink, monogram
STORES = [
    ("Kape Kalye", "Katipunan", "e441ae9e1b9bb90311",
     (22, 38, 94), (201, 242, 63), (26, 39, 7), "K"),
    ("Lola Remy Lutong Bahay", "Maginhawa", "b8aa496807b845bea3",
     (122, 35, 64), (242, 184, 198), (58, 14, 28), "L"),
    ("AKANAN", "Main", "62e452090e1bd66fcd",
     (22, 38, 94), (201, 242, 63), (26, 39, 7), "A"),
]

W, H = 1240, 1748  # A6 at 300dpi, the size of a small tent card
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "qr")


def qr_image(url, box=10):
    # Level H keeps the code readable with roughly a third of it obscured,
    # which on a restaurant table means scuffs and coffee rings.
    q = qrcode.QRCode(error_correction=ERROR_CORRECT_H, box_size=box, border=2)
    q.add_data(url)
    q.make(fit=True)
    return q.make_image(fill_color="black", back_color="white").convert("RGB")


def fit(draw, text, font_path, target_w, start):
    size = start
    while size > 10:
        f = ImageFont.truetype(font_path, size)
        if draw.textlength(text, font=f) <= target_w:
            return f
        size -= 2
    return ImageFont.truetype(font_path, 10)


def centre(draw, y, text, font, fill):
    draw.text(((W - draw.textlength(text, font=font)) / 2, y), text, font=font, fill=fill)
    return y + font.size * 1.25


def card(business, store, token, brand, accent, accent_ink, letter):
    url = f"{BASE}/?s={token}"
    img = Image.new("RGB", (W, H), brand)
    d = ImageDraw.Draw(img)

    bs = 150
    bx, by = (W - bs) / 2, 90
    d.rounded_rectangle([bx, by, bx + bs, by + bs], radius=48, fill=accent)
    mf = ImageFont.truetype(BOLD, 92)
    l, t, r, b = d.textbbox((0, 0), letter, font=mf)
    d.text((bx + bs / 2 - (l + r) / 2, by + bs / 2 - (t + b) / 2),
           letter, font=mf, fill=accent_ink)

    y = by + bs + 60
    y = centre(d, y, business, fit(d, business, BOLD, W - 160, 68), (255, 255, 255))
    y = centre(d, y + 4, store, ImageFont.truetype(REG, 40), accent)

    # White plate behind the code: scanners want that contrast, and a QR
    # printed straight onto a dark brand colour often will not read at all.
    y += 50
    qs, pad = 760, 40
    q = qr_image(url).resize((qs, qs), Image.NEAREST)
    d.rounded_rectangle([(W - qs) / 2 - pad, y - pad, (W + qs) / 2 + pad, y + qs + pad],
                        radius=40, fill=(255, 255, 255))
    img.paste(q, (int((W - qs) / 2), int(y)))
    y += qs + pad + 60

    y = centre(d, y, "Scan to see the menu", ImageFont.truetype(BOLD, 52), (255, 255, 255))
    centre(d, y + 6, "and order from your table", ImageFont.truetype(REG, 38), accent)
    return img, url


def main():
    os.makedirs(OUT, exist_ok=True)
    cards = []
    for business, store, token, brand, accent, ink, letter in STORES:
        slug = business.lower().split()[0]
        img, url = card(business, store, token, brand, accent, ink, letter)
        img.save(os.path.join(OUT, f"qr-card-{slug}.png"), dpi=(300, 300))
        qr_image(url, box=16).save(os.path.join(OUT, f"qr-plain-{slug}.png"))
        cards.append(img)
        print(f"{business} / {store}\n  {url}")

    cards[0].save(os.path.join(OUT, "viosk-table-cards.pdf"), "PDF",
                  resolution=300, save_all=True, append_images=cards[1:])
    print(f"\nWrote {len(cards)} cards + PDF to {OUT}")


if __name__ == "__main__":
    main()

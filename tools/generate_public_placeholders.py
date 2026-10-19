"""Generates placeholder images for frontend/public (hero genplan, interiors, documents, OG).

The client will replace these files with real renders and scans; file names and
aspect ratios must be kept. Block marker positions printed at the end must match
`genplan.blocks` in frontend/src/content/site.ts.

Usage (from repo root): backend/.venv/bin/python tools/generate_public_placeholders.py
"""

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "frontend" / "public"
FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")

GOLD = (201, 164, 92)
INK = (15, 23, 42)
NAVY = (30, 42, 74)
LETTERS = ["А", "Б", "В", "Г", "Д", "Е", "Ж", "И", "К", "Л", "М", "Н"]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_DIR / ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf")), size)


def shade(color: tuple[int, int, int], k: float) -> tuple[int, int, int]:
    return tuple(max(0, min(255, int(c * k))) for c in color)  # type: ignore[return-value]


# ---------- genplan ----------


def tree(d: ImageDraw.ImageDraw, x: float, y: float, r: float, rng: random.Random) -> None:
    g = rng.choice([(96, 128, 82), (110, 140, 88), (84, 116, 76), (122, 148, 96)])
    d.ellipse((x - r + 6, y - r + 8, x + r + 6, y + r + 8), fill=(150, 140, 120))
    d.ellipse((x - r, y - r, x + r, y + r), fill=g)
    d.ellipse((x - r * 0.5, y - r * 0.6, x + r * 0.2, y), fill=shade(g, 1.15))


def building(
    d: ImageDraw.ImageDraw, x: float, y: float, w: float, depth: float, h: float, letter: str
) -> tuple[float, float]:
    # shadow
    d.polygon(
        [(x + w, y - h), (x + w + h * 0.55, y + h * 0.25), (x + w + h * 0.55, y + depth + h * 0.25), (x + w, y + depth)],
        fill=(176, 166, 146),
    )
    d.rectangle((x + 4, y + depth, x + w + h * 0.55, y + depth + h * 0.25), fill=(176, 166, 146))
    # facade
    facade = (x, y + depth - h, x + w, y + depth)
    d.rectangle(facade, fill=(232, 226, 214))
    d.rectangle((x, y + depth - 14, x + w, y + depth), fill=(196, 170, 120))  # retail ground floor
    rows = 10
    fh = (h - 16) / rows
    for r in range(rows):
        wy = facade[1] + 4 + r * fh
        for cx in range(int(x + 10), int(x + w - 10), 18):
            d.rectangle((cx, wy + 2, cx + 10, wy + fh - 2), fill=(126, 146, 172))
    # roof
    roof = (x, y - h, x + w, y + depth - h)
    d.rectangle(roof, fill=(214, 217, 224), outline=(170, 176, 190), width=3)
    # solar panels
    px0, py0 = x + 16, y - h + 14
    for i in range(int((w - 32) // 26)):
        for j in range(2):
            d.rectangle(
                (px0 + i * 26, py0 + j * 22, px0 + i * 26 + 22, py0 + j * 22 + 16), fill=(52, 72, 112)
            )
    cx, cy = x + w / 2, y - h + depth / 2 + 18
    d.text((cx + 2, cy + 3), letter, anchor="mm", fill=(120, 100, 60), font=font(78, True))
    d.text((cx, cy), letter, anchor="mm", fill=GOLD, font=font(78, True))
    return cx, cy


def genplan() -> list[tuple[str, float, float]]:
    w, h = 2400, 1350
    rng = random.Random(7)
    img = Image.new("RGB", (w, h), (226, 218, 200))
    d = ImageDraw.Draw(img)

    # Lawns and roads
    d.rectangle((0, 0, w, h), fill=(214, 206, 186))
    for _ in range(30):
        rx, ry = rng.randint(0, w), rng.randint(0, h)
        d.ellipse((rx - 180, ry - 90, rx + 180, ry + 90), fill=(206, 198, 176))
    road = (88, 92, 100)
    d.rectangle((0, 610, w, 760), fill=road)  # boulevard
    d.rectangle((0, 676, w, 694), fill=(132, 150, 104))  # median
    for x in range(0, w, 70):
        d.rectangle((x, 640, x + 36, 644), fill=(230, 230, 230))
        d.rectangle((x, 726, x + 36, 730), fill=(230, 230, 230))
    d.rectangle((0, 40, w, 110), fill=road)
    d.rectangle((0, 1250, w, 1320), fill=road)
    for x in (80, 1180, 2290):
        d.rectangle((x, 40, x + 70, 1320), fill=road)

    # Courtyards
    for (x1, y1, x2, y2) in [(170, 140, 1160, 590), (1270, 140, 2270, 590), (170, 790, 1160, 1230), (1270, 790, 2270, 1230)]:
        d.rounded_rectangle((x1, y1, x2, y2), radius=28, fill=(170, 186, 132))
        d.rounded_rectangle((x1 + 30, y1 + 30, x2 - 30, y2 - 30), radius=20, outline=(226, 218, 200), width=8)

    # Playground + kindergarten
    d.rounded_rectangle((1340, 1050, 1560, 1200), radius=18, fill=(232, 196, 140))
    for i in range(4):
        d.ellipse((1370 + i * 46, 1100, 1400 + i * 46, 1130), fill=(201, 120, 80))

    # Boulevard trees
    for x in range(40, w, 90):
        tree(d, x, 685, 24, rng)

    positions: list[tuple[str, float, float]] = []
    bw, bd, bh = 290, 150, 120
    xs = [200, 535, 870, 1300, 1635, 1970]
    rows = [(330, LETTERS[:6]), (980, LETTERS[6:])]
    for y, letters in rows:
        for x, letter in zip(xs, letters, strict=True):
            cx, cy = building(d, x, y, bw, bd, bh, letter)
            positions.append((letter, cx / w * 100, cy / h * 100))

    for _ in range(80):
        x = rng.choice([rng.randint(180, 1150), rng.randint(1280, 2260)])
        y = rng.choice([rng.randint(150, 190), rng.randint(540, 585), rng.randint(800, 840), rng.randint(1190, 1225)])
        tree(d, x, y, rng.randint(14, 22), rng)

    # Soft atmospheric light
    glow = Image.new("RGB", (w, h), (255, 236, 200))
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).ellipse((-600, -700, 1600, 700), fill=70)
    img = Image.composite(glow, img, mask.filter(ImageFilter.GaussianBlur(220)))

    img.save(PUBLIC / "hero.jpg", quality=84, optimize=True, progressive=True)
    img.crop((150, 120, 1250, 800)).resize((1200, 742)).save(PUBLIC / "about.jpg", quality=84, optimize=True)

    og = img.resize((1200, 675)).crop((0, 22, 1200, 652)).convert("RGBA")
    overlay = Image.new("RGBA", og.size, (15, 23, 42, 150))
    og = Image.alpha_composite(og, overlay).convert("RGB")
    od = ImageDraw.Draw(og)
    od.text((72, 380), "ЖК «Зарафшон»", fill=(255, 255, 255), font=font(72, True))
    od.text((72, 480), "Жилой квартал нового уровня · 4 км до Душанбе", fill=(230, 226, 214), font=font(32))
    od.rectangle((72, 350, 152, 356), fill=GOLD)
    og.save(PUBLIC / "og.jpg", quality=86, optimize=True)
    return positions


# ---------- interiors ----------

PALETTES = [
    ((236, 228, 214), (196, 168, 128), (120, 96, 72)),
    ((226, 230, 222), (150, 168, 140), (82, 96, 80)),
    ((240, 232, 222), (200, 140, 110), (110, 70, 56)),
    ((228, 232, 240), (120, 138, 170), (46, 60, 92)),
    ((242, 238, 230), (210, 190, 150), (140, 120, 84)),
    ((232, 226, 220), (170, 150, 140), (96, 84, 80)),
    ((236, 236, 232), (160, 160, 150), (70, 70, 66)),
    ((244, 236, 226), (214, 176, 132), (128, 92, 60)),
    ((230, 234, 232), (140, 170, 160), (60, 92, 86)),
]


def interior(index: int, palette: tuple[tuple[int, int, int], ...]) -> None:
    w, h = 1600, 1066
    wall, accent, dark = palette
    img = Image.new("RGB", (w, h), wall)
    d = ImageDraw.Draw(img)
    bx1, by1, bx2, by2 = 380, 200, 1220, 720
    d.polygon([(0, h), (bx1, by2), (bx2, by2), (w, h)], fill=shade(accent, 1.25))  # floor
    for i in range(1, 14):
        t = i / 14
        d.line([(bx1 + (bx2 - bx1) * t, by2), (w * t, h)], fill=shade(accent, 1.12), width=2)
    d.polygon([(0, 0), (bx1, by1), (bx1, by2), (0, h)], fill=shade(wall, 0.93))  # left wall
    d.polygon([(w, 0), (bx2, by1), (bx2, by2), (w, h)], fill=shade(wall, 0.88))  # right wall
    d.polygon([(0, 0), (w, 0), (bx2, by1), (bx1, by1)], fill=shade(wall, 1.03))  # ceiling
    # window with daylight
    wx1, wy1, wx2, wy2 = 560 + (index % 3) * 40, 270, 1040 - (index % 2) * 60, 620
    sky = Image.new("RGB", (wx2 - wx1, wy2 - wy1))
    sd = ImageDraw.Draw(sky)
    for y in range(wy2 - wy1):
        k = y / (wy2 - wy1)
        sd.line([(0, y), (wx2 - wx1, y)], fill=(int(190 + 50 * k), int(214 + 26 * k), int(236 + 10 * k)))
    img.paste(sky, (wx1, wy1))
    d.rectangle((wx1, wy1, wx2, wy2), outline=(250, 250, 250), width=12)
    d.line([((wx1 + wx2) / 2, wy1), ((wx1 + wx2) / 2, wy2)], fill=(250, 250, 250), width=8)
    # light on floor
    light = Image.new("L", (w, h), 0)
    ImageDraw.Draw(light).polygon([(wx1, by2), (wx2, by2), (wx2 + 260, h), (wx1 - 120, h)], fill=60)
    img = Image.composite(Image.new("RGB", (w, h), (255, 248, 230)), img, light.filter(ImageFilter.GaussianBlur(40)))
    d = ImageDraw.Draw(img)
    # furniture: sofa / bed / table depending on index
    kind = index % 3
    if kind == 0:  # sofa
        d.rounded_rectangle((420, 760, 1100, 900), radius=26, fill=dark)
        d.rounded_rectangle((440, 700, 1080, 790), radius=24, fill=shade(dark, 1.2))
        d.ellipse((1180, 820, 1420, 900), fill=shade(accent, 0.8))
    elif kind == 1:  # bed
        d.rounded_rectangle((520, 720, 1180, 960), radius=20, fill=(248, 246, 240))
        d.rounded_rectangle((500, 640, 1200, 740), radius=16, fill=dark)
        d.rounded_rectangle((560, 700, 760, 760), radius=16, fill=(236, 232, 224))
        d.rounded_rectangle((940, 700, 1140, 760), radius=16, fill=(236, 232, 224))
    else:  # kitchen island + pendant lights
        d.rectangle((480, 740, 1140, 900), fill=dark)
        d.rectangle((460, 720, 1160, 748), fill=(244, 242, 236))
        for x in (620, 810, 1000):
            d.line([(x, 0), (x, 470)], fill=(60, 60, 60), width=3)
            d.ellipse((x - 34, 450, x + 34, 500), fill=GOLD)
    d.rectangle((120, 280, 300, 520), fill=shade(accent, 0.95))  # artwork
    img = img.filter(ImageFilter.GaussianBlur(1.2))
    d = ImageDraw.Draw(img)
    d.text((40, h - 56), f"Рендер интерьера {index + 1:02d} · заглушка", fill=shade(dark, 0.9), font=font(24))
    img.save(PUBLIC / "interior" / f"{index + 1:02d}.jpg", quality=82, optimize=True, progressive=True)


# ---------- documents ----------

DOCUMENTS = [
    ("qaror", "ҚАРОРИ РАИСИ ШАҲР", 1),
    ("vakolatnoma", "ВАКОЛАТНОМА", 5),
    ("ijozatnoma-barq", "ИҶОЗАТНОМАИ ҚУВВАИ БАРҚ", 1),
    ("ariza", "АРИЗА БАРОИ ИҶОЗАТНОМА", 1),
    ("shahodatnoma", "ШАҲОДАТНОМАИ ЛОИҲА", 2),
    ("xulosa", "ХУЛОСАИ ЭКСПЕРТИЗА", 2),
]


def document_page(slug: str, title: str, page: int, pages: int, rng: random.Random) -> None:
    w, h = 1240, 1754
    img = Image.new("RGB", (w, h), (252, 251, 248))
    d = ImageDraw.Draw(img)
    d.ellipse((w / 2 - 60, 90, w / 2 + 60, 210), outline=NAVY, width=4)
    d.text((w / 2, 150), "ҶТ", anchor="mm", fill=NAVY, font=font(44, True))
    d.text((w / 2, 260), "ҶУМҲУРИИ ТОҶИКИСТОН", anchor="mm", fill=INK, font=font(26, True))
    d.line([(140, 300), (w - 140, 300)], fill=INK, width=2)
    d.text((w / 2, 370), title, anchor="mm", fill=INK, font=font(38, True))
    d.text((w / 2, 420), f"Саҳифаи {page} аз {pages}", anchor="mm", fill=(110, 110, 110), font=font(22))
    y = 500
    while y < h - 420:
        if rng.random() < 0.12:
            y += 30
            continue
        line_w = rng.randint(700, 960) if rng.random() < 0.85 else rng.randint(300, 600)
        d.rounded_rectangle((140, y, 140 + line_w, y + 14), radius=7, fill=(208, 210, 216))
        y += 36
    sx, sy = w - 380, h - 330
    d.ellipse((sx, sy, sx + 210, sy + 210), outline=(52, 84, 170), width=6)
    d.ellipse((sx + 22, sy + 22, sx + 188, sy + 188), outline=(52, 84, 170), width=2)
    d.text((sx + 105, sy + 105), "МӮҲР", anchor="mm", fill=(52, 84, 170), font=font(30, True))
    d.line([(140, h - 200), (520, h - 200)], fill=INK, width=2)
    d.text((140, h - 180), "Имзо", fill=(110, 110, 110), font=font(22))
    d.text((140, h - 90), "Нусхаи намунавӣ · заглушка", fill=(160, 160, 160), font=font(20))
    img.save(PUBLIC / "docs" / f"{slug}-{page}.jpg", quality=78, optimize=True)


def main() -> None:
    (PUBLIC / "interior").mkdir(parents=True, exist_ok=True)
    (PUBLIC / "docs").mkdir(parents=True, exist_ok=True)
    positions = genplan()
    for i, palette in enumerate(PALETTES):
        interior(i, palette)
    rng = random.Random(3)
    for slug, title, pages in DOCUMENTS:
        for p in range(1, pages + 1):
            document_page(slug, title, p, pages, rng)
    print("Genplan marker positions (percent):")
    for letter, x, y in positions:
        print(f'  {{ letter: "{letter}", x: {x:.1f}, y: {y:.1f} }},')
    _ = math  # keep import for future tweaks


if __name__ == "__main__":
    main()

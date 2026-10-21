"""Generates placeholder floor plans, unit layouts and blueprints into media/.

The drawings are deliberately schematic: they exist so the apartment picker works
end-to-end before the client uploads real architectural images via the admin panel.
They carry no words — only numbers and m² — so they read the same on the Russian and
the Tajik site (room names are listed, translated, next to the drawing).

Usage: python scripts/generate_media.py [--force]
"""

import argparse
import math
import sys
from collections.abc import Sequence
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from seed_data import (  # noqa: E402
    APARTMENTS,
    COMMERCIAL_UNIT,
    CORE,
    CORRIDOR_BOTTOM,
    CORRIDOR_TOP,
    PLAN_BOTTOM,
    PLAN_LEFT,
    PLAN_RIGHT,
    PLAN_TOP,
    SHOP_PLAN,
    TYPICAL_PLAN,
    apartment_rects,
)

MEDIA = ROOT / "media"
FONT_DIRS = [Path("/usr/share/fonts/truetype/dejavu"), Path("/usr/share/fonts/dejavu")]

INK = (15, 23, 42)
MUTED = (100, 116, 139)
WALL = (30, 42, 74)
PAPER = (250, 248, 244)
ROOM = (255, 255, 255)
WET = (236, 242, 248)
OUTDOOR = (241, 236, 226)
BLUEPRINT = (22, 52, 104)
BP_LINE = (226, 236, 255)
BP_GRID = (40, 74, 132)

Rect = tuple[float, float, float, float]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    for d in FONT_DIRS:
        if (d / name).exists():
            return ImageFont.truetype(str(d / name), size)
    return ImageFont.load_default(size)


def centered_text(draw: ImageDraw.ImageDraw, xy: tuple[float, float], text: str, **kw) -> None:
    draw.text(xy, text, anchor="mm", **kw)


def treemap(rect: Rect, items: Sequence[tuple[str, float]]) -> list[tuple[Rect, str, float]]:
    """Binary slice layout: splits items into two near-equal halves along the longer side."""
    if len(items) == 1:
        return [(rect, items[0][0], items[0][1])]
    total = sum(a for _, a in items)
    acc, cut = 0.0, 1
    for i, (_, a) in enumerate(items[:-1], start=1):
        acc += a
        cut = i
        if acc >= total / 2:
            break
    first, second = items[:cut], items[cut:]
    ratio = sum(a for _, a in first) / total
    x1, y1, x2, y2 = rect
    if (x2 - x1) >= (y2 - y1):
        xm = x1 + (x2 - x1) * ratio
        return treemap((x1, y1, xm, y2), first) + treemap((xm, y1, x2, y2), second)
    ym = y1 + (y2 - y1) * ratio
    return treemap((x1, y1, x2, ym), first) + treemap((x1, ym, x2, y2), second)


def room_fill(name: str) -> tuple[int, int, int]:
    if name in ("Ҳ/Б",):
        return WET
    if name in ("Ч/к",):
        return OUTDOOR
    return ROOM


# ---------- floor plans ----------


def svg_color(rgb: tuple[int, int, int]) -> str:
    return "#{:02x}{:02x}{:02x}".format(*rgb)


def floor_plan_svg(path: Path, commercial: bool) -> None:
    """Placeholder floor plan as SVG; unit polygons (percent) line up with its 16:10 frame."""
    w, h = 1600, 1000
    wall, muted, paper = svg_color(WALL), svg_color(MUTED), svg_color(PAPER)
    out: list[str] = []

    def px(r: Sequence[float]) -> tuple[float, float, float, float]:
        return (r[0] * w / 100, r[1] * h / 100, r[2] * w / 100, r[3] * h / 100)

    def rect(r: Sequence[float], **attrs: str | float) -> None:
        x1, y1, x2, y2 = r
        extra = " ".join(f'{k.replace("_", "-")}="{v}"' for k, v in attrs.items())
        out.append(
            f'<rect x="{x1:.1f}" y="{y1:.1f}" width="{x2 - x1:.1f}" '
            f'height="{y2 - y1:.1f}" {extra}/>'
        )

    def text(x: float, y: float, value: str, size: int, fill: str, weight: int = 400) -> None:
        out.append(
            f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" font-weight="{weight}" '
            f'fill="{fill}" text-anchor="middle" dominant-baseline="central">{value}</text>'
        )

    rect((0, 0, w, h), fill=paper)
    outline = px((PLAN_LEFT, PLAN_TOP, PLAN_RIGHT, PLAN_BOTTOM))
    rect(outline, fill="#ffffff")

    if commercial:
        x1, y1, x2, y2 = outline
        for gx in range(int(x1) + 160, int(x2), 160):
            for gy in (y1 + (y2 - y1) / 3, y1 + 2 * (y2 - y1) / 3):
                rect((gx - 9, gy - 9, gx + 9, gy + 9), fill=wall)
        text((x1 + x2) / 2, y1 + (y2 - y1) * 0.2, f"{COMMERCIAL_UNIT[1]:.0f} м²", 44, wall, 700)
    else:
        corridor = px((PLAN_LEFT, CORRIDOR_TOP, PLAN_RIGHT, CORRIDOR_BOTTOM))
        rect(corridor, fill=svg_color((238, 234, 226)), stroke=wall, stroke_width=4)
        apt_by_number = {a.number: a for a in APARTMENTS}
        for number, r in apartment_rects().items():
            x1, y1, x2, y2 = px(r)
            inner = (x1 + 14, y1 + 14, x2 - 14, y2 - 14)
            rooms = sorted(apt_by_number[number].rooms_detail, key=lambda t: -t[1])
            for rr, name, _ in treemap(inner, rooms):
                rect(rr, fill=svg_color(room_fill(name)), stroke="#b4bccc", stroke_width=2)
            rect((x1, y1, x2, y2), fill="none", stroke=wall, stroke_width=6)
            cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
            out.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="38" fill="{wall}"/>')
            text(cx, cy, str(number), 38, "#ffffff", 700)

    # Stair and lift core: one entrance per block, on every floor.
    cx1, cy1, cx2, cy2 = px(CORE)
    rect((cx1, cy1, cx2, cy2), fill=svg_color(OUTDOOR), stroke=wall, stroke_width=6)
    split = cx1 + (cx2 - cx1) * 0.6
    for i in range(1, 9):
        x = cx1 + i * (split - cx1) / 9
        out.append(
            f'<line x1="{x:.1f}" y1="{cy1 + 6:.1f}" x2="{x:.1f}" y2="{cy2 - 6:.1f}" '
            f'stroke="{wall}" stroke-width="2"/>'
        )
    rect((split, cy1, cx2, cy2), fill="#ffffff", stroke=wall, stroke_width=4)
    out.append(
        f'<path d="M{split:.1f} {cy1:.1f} L{cx2:.1f} {cy2:.1f} M{cx2:.1f} {cy1:.1f} '
        f'L{split:.1f} {cy2:.1f}" stroke="{wall}" stroke-width="2"/>'
    )
    rect(outline, fill="none", stroke=wall, stroke_width=10)

    title = "1" if commercial else "2–9"
    out.append(f'<text x="40" y="52" font-size="26" fill="{muted}">{title}</text>')
    path.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
        f'viewBox="0 0 {w} {h}" font-family="DejaVu Sans, Arial, sans-serif">'
        + "".join(out)
        + "</svg>\n",
        encoding="utf-8",
    )


# ---------- unit drawings ----------


def unit_frame(area: float) -> tuple[float, float]:
    """Real-world width/height in metres for a rectangular unit of given area."""
    width = math.sqrt(area * 1.4)
    return width, area / width


def unit_layout(path: Path, title: str, rooms: Sequence[tuple[str, float]], area: float) -> None:
    w, h = 1400, 1000
    img = Image.new("RGB", (w, h), PAPER)
    d = ImageDraw.Draw(img)
    rw, rh = unit_frame(area)
    scale = min((w - 200) / rw, (h - 220) / rh)
    ox, oy = (w - rw * scale) / 2, 140 + (h - 200 - rh * scale) / 2
    outer = (ox, oy, ox + rw * scale, oy + rh * scale)

    for rect, name, room_area in treemap(outer, sorted(rooms, key=lambda t: -t[1])):
        d.rectangle(rect, fill=room_fill(name), outline=WALL, width=5)
        cx, cy = (rect[0] + rect[2]) / 2, (rect[1] + rect[3]) / 2
        small = (rect[2] - rect[0]) < 170
        centered_text(d, (cx, cy), f"{room_area:.1f} м²", fill=INK, font=font(20 if small else 26))
    d.rectangle(outer, outline=WALL, width=12)

    d.text((60, 46), title, fill=INK, font=font(40, True))
    d.text((60, 98), f"{area:.2f} м²", fill=MUTED, font=font(22))
    img.save(path, optimize=True)


def unit_blueprint(path: Path, title: str, rooms: Sequence[tuple[str, float]], area: float) -> None:
    w, h = 1400, 1000
    img = Image.new("RGB", (w, h), BLUEPRINT)
    d = ImageDraw.Draw(img)
    for gx in range(0, w, 25):
        d.line([(gx, 0), (gx, h)], fill=BP_GRID, width=1 if gx % 125 else 2)
    for gy in range(0, h, 25):
        d.line([(0, gy), (w, gy)], fill=BP_GRID, width=1 if gy % 125 else 2)

    rw, rh = unit_frame(area)
    scale = min((w - 320) / rw, (h - 320) / rh)
    ox, oy = (w - rw * scale) / 2, (h - rh * scale) / 2 + 20
    outer = (ox, oy, ox + rw * scale, oy + rh * scale)

    for rect, _name, room_area in treemap(outer, sorted(rooms, key=lambda t: -t[1])):
        d.rectangle(rect, outline=BP_LINE, width=3)
        cx, cy = (rect[0] + rect[2]) / 2, (rect[1] + rect[3]) / 2
        centered_text(d, (cx, cy), f"{room_area:.1f}", fill=BP_LINE, font=font(18))
    d.rectangle(outer, outline=BP_LINE, width=8)

    # Dimension lines (mm)
    x1, y1, x2, y2 = outer
    dim_font = font(20)
    d.line([(x1, y1 - 50), (x2, y1 - 50)], fill=BP_LINE, width=2)
    for x in (x1, x2):
        d.line([(x, y1 - 62), (x, y1 - 38)], fill=BP_LINE, width=2)
    centered_text(d, ((x1 + x2) / 2, y1 - 72), f"{rw * 1000:.0f}", fill=BP_LINE, font=dim_font)
    d.line([(x1 - 50, y1), (x1 - 50, y2)], fill=BP_LINE, width=2)
    for y in (y1, y2):
        d.line([(x1 - 62, y), (x1 - 38, y)], fill=BP_LINE, width=2)
    label = Image.new("RGBA", (200, 40), (0, 0, 0, 0))
    ImageDraw.Draw(label).text(
        (100, 20), f"{rh * 1000:.0f}", anchor="mm", fill=BP_LINE, font=dim_font
    )
    label = label.rotate(90, expand=True)
    img.paste(label, (int(x1 - 100), int((y1 + y2) / 2 - 100)), label)

    # Title block
    tb = (w - 420, h - 120, w - 40, h - 40)
    d.rectangle(tb, outline=BP_LINE, width=2)
    d.text((tb[0] + 16, tb[1] + 12), title, fill=BP_LINE, font=font(22, True))
    d.text(
        (tb[0] + 16, tb[1] + 46),
        f"1:100 · {area:.2f} м²",
        fill=BP_LINE,
        font=font(16),
    )
    img.save(path, optimize=True)


def generate(force: bool = False) -> None:
    (MEDIA / "floors").mkdir(parents=True, exist_ok=True)
    (MEDIA / "units").mkdir(parents=True, exist_ok=True)

    jobs: list[tuple[Path, object]] = [
        (MEDIA / TYPICAL_PLAN, lambda p: floor_plan_svg(p, commercial=False)),
        (MEDIA / SHOP_PLAN, lambda p: floor_plan_svg(p, commercial=True)),
    ]
    for apt in APARTMENTS:
        title = f"№ {apt.number}"
        jobs.append(
            (
                MEDIA / f"units/layout_{apt.number}.png",
                lambda p, t=title, a=apt: unit_layout(p, t, a.rooms_detail, a.area),
            )
        )
        jobs.append(
            (
                MEDIA / f"units/blueprint_{apt.number}.png",
                lambda p, t=title, a=apt: unit_blueprint(p, t, a.rooms_detail, a.area),
            )
        )
    _, area, rooms = COMMERCIAL_UNIT
    jobs.append(
        (
            MEDIA / "units/layout_commercial_ground.png",
            lambda p: unit_layout(p, "№ 1", rooms, area),
        )
    )
    jobs.append(
        (
            MEDIA / "units/blueprint_commercial_ground.png",
            lambda p: unit_blueprint(p, "№ 1", rooms, area),
        )
    )

    for path, fn in jobs:
        if force or not path.exists():
            fn(path)  # type: ignore[operator]
            print(f"  wrote {path.relative_to(ROOT)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="overwrite existing images")
    generate(parser.parse_args().force)

// One-time optimizer for the hero slideshow (src/components/sections/HeroBackground.tsx).
//   public/hero/hero-N.jpg → public/hero/hero-N-1920.webp (desktop) + hero-N-960.webp (mobile)
// Run after replacing a source photo: node scripts/build-hero.mjs
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "hero");
const WIDTHS = [1920, 960];
const QUALITY = 72;
// Size budget per width; a photo over it is re-encoded a few quality steps lower.
const BUDGET_KB = { 1920: 250, 960: 100 };

const sources = (await fs.readdir(DIR)).filter((f) => /^hero-\d+\.jpe?g$/i.test(f)).sort();
for (const file of sources) {
  const name = file.replace(/\.[^.]+$/, "");
  const sizes = [];
  for (const width of WIDTHS) {
    const out = path.join(DIR, `${name}-${width}.webp`);
    let quality = QUALITY;
    let info;
    do {
      info = await sharp(path.join(DIR, file))
        .resize({ width, withoutEnlargement: true })
        .webp({ quality, effort: 6 })
        .toFile(out);
    } while (info.size / 1024 > BUDGET_KB[width] && (quality -= 2) >= 64);
    const q = Math.max(quality, 64);
    sizes.push(`${width}w ${info.width}×${info.height} q${q} ${Math.round(info.size / 1024)} KB`);
  }
  console.log(`${name}: ${sizes.join(" | ")}`);
}

// One-time optimizer for the hero slideshow (src/components/sections/HeroBackground.tsx).
//   public/hero/hero-N.jpg → public/hero/hero-N-1920.webp (desktop) + hero-N-960.webp (mobile)
//                          + an AVIF twin of each, and hero-N-portrait.avif (portrait phones)
// Run after replacing a source photo: node scripts/build-hero.mjs
//
// AVIF quality is searched per photo: the lowest quality whose SSIM against the resized
// source is at least the WebP's, so the AVIF looks the same and is only smaller.
//
// hero-N-portrait.avif is the 960 px image with the left and right edges cut off (same
// scale, centred). On a portrait phone the hero is far taller than wide, so `object-fit:
// cover` + centred position (mobile CSS) shows only the middle of the photo; the crop keeps
// everything a container up to PORTRAIT_ASPECT wide can show, so the pixels on screen are
// identical. HeroBackground serves it only when the viewport is at most 3:5 (see PORTRAIT
// there), which leaves a wide margin for browser bars and the hero's 24 px parallax bleed.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "hero");
const WIDTHS = [1920, 960];
const QUALITY = 72;
// Size budget per width; a photo over it is re-encoded a few quality steps lower.
const BUDGET_KB = { 1920: 250, 960: 100 };
/** Widest hero box (width / height) the portrait crop must still cover. */
const PORTRAIT_ASPECT = 0.9;
/** aom speed: 9 is several minutes per 1920 px photo for ~2% fewer bytes. */
const AVIF_EFFORT = 6;

const mtime = (file) =>
  fs.stat(file).then(
    (s) => s.mtimeMs,
    () => 0,
  );

async function raw(image) {
  const { data, info } = await image.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Mean SSIM of the luma over 8×8 blocks. */
function ssim(a, b) {
  const luma = ({ data }) => {
    const out = new Float64Array(data.length / 3);
    for (let i = 0; i < out.length; i++)
      out[i] = 0.299 * data[3 * i] + 0.587 * data[3 * i + 1] + 0.114 * data[3 * i + 2];
    return out;
  };
  const [x, y] = [luma(a), luma(b)];
  const { width: w, height: h } = a;
  const C1 = 6.5025;
  const C2 = 58.5225;
  let sum = 0;
  let blocks = 0;
  for (let by = 0; by + 8 <= h; by += 8)
    for (let bx = 0; bx + 8 <= w; bx += 8) {
      let mx = 0;
      let my = 0;
      for (let j = 0; j < 8; j++)
        for (let i = 0; i < 8; i++) {
          mx += x[(by + j) * w + bx + i];
          my += y[(by + j) * w + bx + i];
        }
      mx /= 64;
      my /= 64;
      let vx = 0;
      let vy = 0;
      let cov = 0;
      for (let j = 0; j < 8; j++)
        for (let i = 0; i < 8; i++) {
          const dx = x[(by + j) * w + bx + i] - mx;
          const dy = y[(by + j) * w + bx + i] - my;
          vx += dx * dx;
          vy += dy * dy;
          cov += dx * dy;
        }
      sum +=
        ((2 * mx * my + C1) * (2 * (cov / 63) + C2)) /
        ((mx * mx + my * my + C1) * ((vx + vy) / 63 + C2));
      blocks += 1;
    }
  return sum / blocks;
}

/** Lowest AVIF quality (40…80) whose SSIM to `ref` reaches `target`. */
async function avifMatching(pipeline, ref, target) {
  let lo = 40;
  let hi = 80;
  let best = null;
  while (lo <= hi) {
    const quality = (lo + hi) >> 1;
    const buf = await pipeline().avif({ quality, effort: AVIF_EFFORT }).toBuffer();
    if (ssim(ref, await raw(sharp(buf))) >= target) {
      best = { buf, quality };
      hi = quality - 1;
    } else lo = quality + 1;
  }
  return (
    best ?? {
      buf: await pipeline().avif({ quality: 80, effort: AVIF_EFFORT }).toBuffer(),
      quality: 80,
    }
  );
}

const sources = (await fs.readdir(DIR)).filter((f) => /^hero-\d+\.jpe?g$/i.test(f)).sort();
for (const file of sources) {
  const name = file.replace(/\.[^.]+$/, "");
  const sizes = [];
  for (const width of WIDTHS) {
    const out = path.join(DIR, `${name}-${width}.webp`);
    const resized = () => sharp(path.join(DIR, file)).resize({ width, withoutEnlargement: true });
    // An existing WebP newer than its source is kept as it is.
    if ((await mtime(out)) < (await mtime(path.join(DIR, file)))) {
      let quality = QUALITY;
      let info;
      do {
        info = await resized().webp({ quality, effort: 6 }).toFile(out);
      } while (info.size / 1024 > BUDGET_KB[width] && (quality -= 2) >= 64);
      const q = Math.max(quality, 64);
      sizes.push(`${width}w ${info.width}×${info.height} q${q} ${Math.round(info.size / 1024)} KB`);
    } else sizes.push(`${width}w kept ${Math.round((await fs.stat(out)).size / 1024)} KB`);

    // AVIF twin, as good as the WebP by SSIM.
    const ref = await raw(resized());
    const target = ssim(ref, await raw(sharp(out)));
    const avif = await avifMatching(resized, ref, target);
    await fs.writeFile(path.join(DIR, `${name}-${width}.avif`), avif.buf);
    sizes.push(`avif q${avif.quality} ${Math.round(avif.buf.length / 1024)} KB`);

    if (width !== 960) continue;
    // Portrait crop: same scale, centred, an even number of pixels cut from each side.
    const { width: w, height: h } = ref;
    let cw = Math.min(w, Math.ceil(h * PORTRAIT_ASPECT));
    if ((w - cw) % 2) cw += 1;
    const crop = { left: (w - cw) / 2, top: 0, width: cw, height: h };
    const cropped = () => resized().extract(crop);
    const portrait = await cropped()
      .avif({ quality: avif.quality, effort: AVIF_EFFORT })
      .toFile(path.join(DIR, `${name}-portrait.avif`));
    sizes.push(`portrait ${cw}×${h} ${Math.round(portrait.size / 1024)} KB`);
  }
  console.log(`${name}: ${sizes.join(" | ")}`);
}

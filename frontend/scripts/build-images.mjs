// Pre-builds resized WebP copies of the images in public/ for next/image.
//
// Vercel Services do not run the /_next/image optimizer, so next.config.ts uses a custom
// loader (src/lib/image-loader.ts) that points next/image at these files instead:
//   public/renders/about.jpg → public/_img/renders/about-{64…1920}.webp
// Widths and a content hash per image go to src/generated/images.json, which the loader
// reads; the hash (?v=…) lets these files be cached for a year (next.config.ts headers).
// Runs before `next build` (npm run build); unchanged images are skipped.
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const OUT = path.join(PUBLIC, "_img");
const MANIFEST = path.join(ROOT, "src", "generated", "images.json");

// Must cover next.config.ts → images.deviceSizes + imageSizes. 720 covers an image inside
// the 16 px page gutters on the common 412 px × 1.75 DPR phone (665 px; else rounds up to 828).
const WIDTHS = [64, 128, 256, 384, 640, 720, 828, 1080, 1280, 1920];
const QUALITY = 76;
// Pre-built elsewhere (hero <picture> set), only for social previews, or not images.
const SKIP = [/^_img\//, /^hero\//, /^og\.jpg$/, /^fonts\//];

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const mtime = (file) =>
  fs.stat(file).then(
    (s) => s.mtimeMs,
    () => 0,
  );

const manifest = {};
let built = 0;
for await (const file of walk(PUBLIC)) {
  const rel = path.relative(PUBLIC, file).split(path.sep).join("/");
  if (!/\.(jpe?g|png)$/i.test(rel) || SKIP.some((re) => re.test(rel))) continue;

  const { width } = await sharp(file).metadata();
  // Every listed width below the original, plus the original width itself as the top size.
  const widths = [...WIDTHS.filter((w) => w < width), Math.min(width, WIDTHS.at(-1))];
  const stem = rel.replace(/\.[^.]+$/, "");
  const srcTime = await mtime(file);
  for (const w of widths) {
    const out = path.join(OUT, `${stem}-${w}.webp`);
    if ((await mtime(out)) >= srcTime) continue;
    await fs.mkdir(path.dirname(out), { recursive: true });
    await sharp(file).resize({ width: w }).webp({ quality: QUALITY, effort: 5 }).toFile(out);
    built += 1;
  }
  const v = createHash("sha1")
    .update(await fs.readFile(file))
    .digest("hex")
    .slice(0, 8);
  manifest[`/${rel}`] = { w: widths, v };
}

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
await fs.mkdir(path.dirname(MANIFEST), { recursive: true });
await fs.writeFile(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(`images: ${Object.keys(sorted).length} sources, ${built} variants written`);

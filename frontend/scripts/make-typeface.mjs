// Builds a minimal three.js typeface JSON (FontLoader format) with only the glyphs the
// 3D scenes need — the block numbers on the roofs. Usage: node scripts/make-typeface.mjs <font.ttf>
import { readFileSync, writeFileSync } from "node:fs";
import opentype from "opentype.js";

const [, , fontPath = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"] = process.argv;
const CHARS = "0123456789";
const buf = readFileSync(fontPath);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const scale = 1000 / font.unitsPerEm;
const r = (n) => Math.round(n * scale);

const glyphs = {};
for (const ch of CHARS) {
  const glyph = font.charToGlyph(ch);
  const box = glyph.getBoundingBox();
  const o = glyph.path.commands
    .map((c) => {
      switch (c.type) {
        case "M":
          return `m ${r(c.x)} ${r(c.y)}`;
        case "L":
          return `l ${r(c.x)} ${r(c.y)}`;
        // FontLoader expects the end point first, then control point(s).
        case "Q":
          return `q ${r(c.x)} ${r(c.y)} ${r(c.x1)} ${r(c.y1)}`;
        case "C":
          return `b ${r(c.x)} ${r(c.y)} ${r(c.x1)} ${r(c.y1)} ${r(c.x2)} ${r(c.y2)}`;
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join(" ");
  glyphs[ch] = { ha: r(glyph.advanceWidth), x_min: r(box.x1), x_max: r(box.x2), o };
}

const json = {
  glyphs,
  familyName: font.names.fontFamily?.en ?? "Zarafshon Letters",
  ascender: r(font.ascender),
  descender: r(font.descender),
  underlinePosition: r(font.tables.post.underlinePosition),
  underlineThickness: r(font.tables.post.underlineThickness),
  boundingBox: {
    xMin: r(font.tables.head.xMin),
    yMin: r(font.tables.head.yMin),
    xMax: r(font.tables.head.xMax),
    yMax: r(font.tables.head.yMax),
  },
  resolution: 1000,
  original_font_information: { format: 0, copyright: font.names.copyright?.en ?? "" },
};
writeFileSync("public/fonts/zarafshon-letters.typeface.json", JSON.stringify(json));
console.log("glyphs:", Object.keys(glyphs).join(""));

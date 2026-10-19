import * as THREE from "three";

/**
 * Procedural textures (canvas → GPU) — tiny compared to shipping images or GLB files.
 * Cached per page so every building shares the same GPU memory.
 */
let cache: ReturnType<typeof build> | null = null;

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function facade(columns: number, seed: number) {
  const W = 512;
  const H = 512;
  const [c, ctx] = canvas(W, H);
  const [e, ectx] = canvas(W, H);
  let s = seed;
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;

  ctx.fillStyle = "#efe8db";
  ctx.fillRect(0, 0, W, H);
  ectx.fillStyle = "#000";
  ectx.fillRect(0, 0, W, H);

  const floors = 9; // ground-floor shops + 8 residential floors
  const fh = H / floors;
  // Ground floor: glazed retail band
  ctx.fillStyle = "#3a3a3c";
  ctx.fillRect(0, H - fh, W, fh);
  ectx.fillStyle = "#5c3d12";
  ectx.fillRect(0, H - fh * 0.85, W, fh * 0.6);
  ctx.fillStyle = "#c9a45c";
  ctx.fillRect(0, H - fh - 4, W, 4);

  const cw = W / columns;
  for (let f = 0; f < floors - 1; f++) {
    const y = f * fh + fh * 0.28;
    const bandH = fh * 0.5;
    ctx.fillStyle = "#26304a";
    ctx.fillRect(0, y, W, bandH);
    for (let col = 0; col < columns; col++) {
      const x = col * cw + cw * 0.12;
      const w = cw * 0.76;
      const lit = rand() < 0.42;
      ctx.fillStyle = lit ? "#ffd497" : "#3b4865";
      ctx.fillRect(x, y + 3, w, bandH - 6);
      if (lit) {
        ectx.fillStyle = rand() < 0.5 ? "#ffb259" : "#ffcf8a";
        ectx.fillRect(x, y + 3, w, bandH - 6);
      }
    }
    // Slab line
    ctx.fillStyle = "#d9d0bf";
    ctx.fillRect(0, f * fh, W, 3);
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const emissive = new THREE.CanvasTexture(e);
  emissive.colorSpace = THREE.SRGBColorSpace;
  return { map, emissive };
}

function panels() {
  const [c, ctx] = canvas(256, 64);
  ctx.fillStyle = "#1c2c55";
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = "#8ea3cf";
  ctx.lineWidth = 2;
  for (let x = 0; x <= 256; x += 32) ctx.strokeRect(x + 2, 2, 28, 60);
  ctx.beginPath();
  ctx.moveTo(0, 32);
  ctx.lineTo(256, 32);
  ctx.stroke();
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;

  // Diagonal glint streak; its offset is animated to sweep across the panels.
  const [g, gctx] = canvas(256, 64);
  gctx.fillStyle = "#000";
  gctx.fillRect(0, 0, 256, 64);
  const grad = gctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0.42, "rgba(0,0,0,1)");
  grad.addColorStop(0.5, "rgba(255,244,214,1)");
  grad.addColorStop(0.58, "rgba(0,0,0,1)");
  gctx.fillStyle = grad;
  gctx.setTransform(1, 0, -0.6, 1, 20, 0);
  gctx.fillRect(-60, 0, 380, 64);
  const glint = new THREE.CanvasTexture(g);
  glint.wrapS = THREE.RepeatWrapping;
  glint.colorSpace = THREE.SRGBColorSpace;
  return { map, glint };
}

function build() {
  const front = facade(14, 7);
  const side = facade(5, 13);
  return { front, side, panels: panels() };
}

export function getTextures() {
  if (!cache) cache = build();
  return cache;
}

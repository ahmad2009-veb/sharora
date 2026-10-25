/**
 * World layout of the complex: two 9-storey blocks (one entrance, 7 apartments per floor)
 * standing side by side along x, end walls 5 m apart. Units are roughly 10 m.
 */
export const BUILDING = { w: 3.6, d: 1.4, h: 2.9 } as const;

export type BlockSpot = { letter: string; x: number; z: number; index: number };

/** Gap between the end walls of the two blocks: 5 m. */
const BLOCK_GAP = 0.5;
const BLOCK_X = (BUILDING.w + BLOCK_GAP) / 2;

export const BLOCKS: BlockSpot[] = [
  { letter: "1", index: 0, x: -BLOCK_X, z: 0 },
  { letter: "2", index: 1, x: BLOCK_X, z: 0 },
];

/** Half-size of the paved plot around the two blocks. */
export const PLOT = { x: 4.6, z: 2.6 } as const;

/** Lawn strip in front of the blocks (z centre and depth). */
export const LAWN = { z: 1.45, d: 1.1 } as const;

/** Deterministic pseudo-random generator so tree placement is stable between renders. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function treePositions(count: number): [number, number, number][] {
  const rand = seeded(42);
  const out: [number, number, number][] = [];
  // Rows along the long edges of the plot and a few on the front lawn
  for (let x = -PLOT.x + 0.3; x <= PLOT.x - 0.3; x += 0.5) {
    out.push([x + (rand() - 0.5) * 0.1, 0, -PLOT.z + 0.25]);
    out.push([x + (rand() - 0.5) * 0.1, 0, PLOT.z - 0.25]);
  }
  for (const x of [-3.6, -2.2, -0.6, 0.6, 2.2, 3.6]) out.push([x, 0, LAWN.z + (rand() - 0.5) * 0.3]);
  // Scattered groves outside the perimeter road
  while (out.length < count) {
    const x = (rand() - 0.5) * 30;
    const z = (rand() - 0.5) * 20;
    if (Math.abs(x) < PLOT.x + 1.6 && Math.abs(z) < PLOT.z + 1.6) continue;
    out.push([x, 0, z]);
  }
  return out.slice(0, count);
}

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeOutBack = (t: number) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

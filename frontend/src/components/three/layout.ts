/**
 * World layout of the квартал, mirroring the genplan (hero.jpg): two rows of six blocks
 * split by a boulevard (z = 0) and a cross street (x = 0). Units are roughly 10 m.
 */
export const BUILDING = { w: 2.1, d: 1.3, h: 2.6 } as const;

const XS = [-6.5, -4.1, -1.7, 1.7, 4.1, 6.5];
const LETTERS = ["А", "Б", "В", "Г", "Д", "Е", "Ж", "И", "К", "Л", "М", "Н"];

export type BlockSpot = { letter: string; x: number; z: number; index: number };

export const BLOCKS: BlockSpot[] = LETTERS.map((letter, index) => ({
  letter,
  index,
  x: XS[index % 6],
  z: index < 6 ? -2.15 : 2.15,
}));

/** The 32 future blocks of the 44-block town, placed around the first quarter. */
export const FUTURE_BLOCKS: { x: number; z: number }[] = [
  ...[-14.1, -11.7, -9.3, -6.5, -4.1, -1.7, 1.7, 4.1, 6.5, 9.3, 11.7, 14.1].flatMap((x) => [
    { x, z: -6.6 },
    { x, z: 6.6 },
  ]),
  ...[-11.7, -9.3, 9.3, 11.7].flatMap((x) => [
    { x, z: -2.15 },
    { x, z: 2.15 },
  ]),
];

/** Deterministic pseudo-random generator so tree placement is stable between renders. */
export function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function treePositions(count: number, wide = false): [number, number, number][] {
  const rand = seeded(42);
  const out: [number, number, number][] = [];
  // Boulevard median
  for (let x = -8.6; x <= 8.6; x += 0.62) {
    if (Math.abs(x) < 0.9) continue;
    out.push([x, 0, 0]);
  }
  // Courtyard edges between blocks
  for (const z of [-3.25, -1.05, 1.05, 3.25]) {
    for (let x = -7.8; x <= 7.8; x += 0.55) {
      if (Math.abs(x) < 0.8 || rand() < 0.45) continue;
      out.push([x + (rand() - 0.5) * 0.2, 0, z + (rand() - 0.5) * 0.15]);
    }
  }
  // Scattered groves outside the perimeter road
  const radius = wide ? 22 : 15;
  while (out.length < count) {
    const x = (rand() - 0.5) * radius * 2;
    const z = (rand() - 0.5) * radius * 1.3;
    if (Math.abs(x) < 9 && Math.abs(z) < 4.3) continue;
    if (wide && Math.abs(z) > 5.5 && Math.abs(z) < 7.7 && Math.abs(x) < 15.3) continue;
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

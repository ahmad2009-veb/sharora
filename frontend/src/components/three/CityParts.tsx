"use client";

import { Center, Outlines, Text3D } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";

import {
  BLOCKS,
  BUILDING,
  clamp01,
  easeOutBack,
  easeOutCubic,
  FUTURE_BLOCKS,
  treePositions,
  type BlockSpot,
} from "./layout";
import { getTextures } from "./textures";

const FONT_URL = "/fonts/sharora-letters.typeface.json";
const GOLD = "#C9A45C";

// ---------------------------------------------------------------- ground & streets

export function Ground({ wide = false }: { wide?: boolean }) {
  const lawns: [number, number, number, number][] = [
    [-4.2, -2.15, 7.4, 2.5],
    [4.2, -2.15, 7.4, 2.5],
    [-4.2, 2.15, 7.4, 2.5],
    [4.2, 2.15, 7.4, 2.5],
  ];
  const dashes = useMemo(() => {
    const out: number[] = [];
    for (let x = -9.5; x <= 9.5; x += 0.7) out.push(x);
    return out;
  }, []);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color="#b9ac8e" roughness={1} />
      </mesh>
      {lawns.map(([x, z, w, d], i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[x, 0.004, z]}>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial color="#7d9858" roughness={1} />
        </mesh>
      ))}
      {/* Boulevard, cross street, perimeter */}
      {(
        [
          [0, 0, 20, 1.5],
          [0, -3.75, 20, 0.7],
          [0, 3.75, 20, 0.7],
          [0, 0, 0.9, 8.2],
          [-8.6, 0, 0.7, 8.2],
          [8.6, 0, 0.7, 8.2],
          ...(wide
            ? ([
                [0, -8.2, 34, 0.7],
                [0, 8.2, 34, 0.7],
                [-15.6, 0, 0.7, 17],
                [15.6, 0, 0.7, 17],
              ] as const)
            : []),
        ] as const
      ).map(([x, z, w, d], i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[x, 0.006, z]}>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial color="#454a57" roughness={0.95} />
        </mesh>
      ))}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.008, 0]}>
        <planeGeometry args={[19.5, 0.26]} />
        <meshStandardMaterial color="#6f8a4f" roughness={1} />
      </mesh>
      {dashes.map((x) => (
        <group key={x}>
          <mesh rotation-x={-Math.PI / 2} position={[x, 0.009, 0.45]}>
            <planeGeometry args={[0.3, 0.035]} />
            <meshBasicMaterial color="#d9d5ca" />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position={[x, 0.009, -0.45]}>
            <planeGeometry args={[0.3, 0.035]} />
            <meshBasicMaterial color="#d9d5ca" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- trees (instanced)

const FOLIAGE = ["#5f7d45", "#6d8b4c", "#4f6c3d", "#7a9455"].map((c) => new THREE.Color(c));

export function Trees({ count, wide = false }: { count: number; wide?: boolean }) {
  const crowns = useRef<THREE.InstancedMesh>(null);
  const trunks = useRef<THREE.InstancedMesh>(null);
  const positions = useMemo(() => treePositions(count, wide), [count, wide]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    positions.forEach(([x, , z], i) => {
      const k = 0.75 + ((i * 37) % 10) / 20;
      s.set(k, k * (0.9 + ((i * 13) % 5) / 10), k);
      p.set(x, 0.18 * k + 0.28 * s.y, z);
      m.compose(p, q, s);
      crowns.current!.setMatrixAt(i, m);
      crowns.current!.setColorAt(i, FOLIAGE[i % FOLIAGE.length]);
      p.set(x, 0.09 * k, z);
      s.set(k, k, k);
      m.compose(p, q, s);
      trunks.current!.setMatrixAt(i, m);
    });
    crowns.current!.instanceMatrix.needsUpdate = true;
    if (crowns.current!.instanceColor) crowns.current!.instanceColor.needsUpdate = true;
    trunks.current!.instanceMatrix.needsUpdate = true;
  }, [positions]);

  return (
    <group>
      <instancedMesh ref={crowns} args={[undefined, undefined, positions.length]} castShadow>
        <coneGeometry args={[0.2, 0.56, 6]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh ref={trunks} args={[undefined, undefined, positions.length]}>
        <cylinderGeometry args={[0.025, 0.035, 0.18, 5]} />
        <meshStandardMaterial color="#6b4f35" roughness={1} />
      </instancedMesh>
    </group>
  );
}

// ---------------------------------------------------------------- buildings

function useBuildingMaterials() {
  return useMemo(() => {
    const { front, side } = getTextures();
    const facade = (t: { map: THREE.Texture; emissive: THREE.Texture }) =>
      new THREE.MeshStandardMaterial({
        map: t.map,
        emissiveMap: t.emissive,
        emissive: new THREE.Color("#ffffff"),
        emissiveIntensity: 1.1,
        roughness: 0.82,
        metalness: 0.02,
      });
    const roof = new THREE.MeshStandardMaterial({ color: "#d8d3c8", roughness: 0.9 });
    const sideMat = facade(side);
    const frontMat = facade(front);
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z
    return [sideMat, sideMat, roof, roof, frontMat, frontMat];
  }, []);
}

const boxGeometry = (() => {
  let g: THREE.BoxGeometry | null = null;
  return () => {
    if (!g) {
      g = new THREE.BoxGeometry(BUILDING.w, BUILDING.h, BUILDING.d);
      g.translate(0, BUILDING.h / 2, 0); // grow from the ground
    }
    return g;
  };
})();

type BuildingProps = {
  spot: BlockSpot;
  /** Seconds after mount when the building starts growing; null = already built. */
  growAt?: number | null;
  letterAt?: number | null;
  hovered?: boolean;
  onOver?: (e: ThreeEvent<PointerEvent>) => void;
  onOut?: (e: ThreeEvent<PointerEvent>) => void;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  showLetter?: boolean;
  highlight?: boolean;
};

const GROW = 0.95;
const DROP = 0.75;

export function Building({
  spot,
  growAt = null,
  letterAt = null,
  hovered = false,
  onOver,
  onOut,
  onClick,
  showLetter = true,
}: BuildingProps) {
  const materials = useBuildingMaterials();
  const body = useRef<THREE.Mesh>(null);
  const letter = useRef<THREE.Group>(null);
  const roofItems = useRef<THREE.Group>(null);
  const glint = useMemo(() => {
    const t = getTextures().panels.glint.clone();
    t.needsUpdate = true;
    t.offset.x = spot.index * 0.13;
    return t;
  }, [spot.index]);
  const start = useRef<number | null>(null);
  const done = useRef(growAt === null);

  useFrame((state, delta) => {
    glint.offset.x = (glint.offset.x + delta * 0.18) % 1;
    if (done.current) return;
    if (start.current === null) start.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - start.current;
    const g = easeOutCubic(clamp01((t - (growAt ?? 0)) / GROW));
    body.current!.scale.y = Math.max(0.001, g);
    roofItems.current!.position.y = BUILDING.h * g;
    roofItems.current!.visible = g > 0.98;
    if (letter.current) {
      const l = clamp01((t - (letterAt ?? 0)) / DROP);
      letter.current.visible = l > 0;
      letter.current.position.y = 0.02 + (1 - easeOutBack(l)) * 2.6;
      if (l >= 1) done.current = true;
    } else if (g >= 1) {
      done.current = true;
    }
  });

  const initialScale = growAt === null ? 1 : 0.001;

  return (
    <group position={[spot.x, 0, spot.z]}>
      <mesh
        ref={body}
        geometry={boxGeometry()}
        material={materials}
        scale={[1, initialScale, 1]}
        onPointerOver={onOver}
        onPointerOut={onOut}
        onClick={onClick}
      >
        {hovered && <Outlines thickness={3} screenspace color={GOLD} />}
      </mesh>
      <group
        ref={roofItems}
        position={[0, growAt === null ? BUILDING.h : 0, 0]}
        visible={growAt === null}
      >
        <SolarPanels glint={glint} />
        {showLetter && (
          <group ref={letter} position={[0, 0.02, 0.18]} visible={growAt === null}>
            <Suspense fallback={null}>
              <RoofLetter char={spot.letter} hovered={hovered} />
            </Suspense>
          </group>
        )}
      </group>
    </group>
  );
}

function SolarPanels({ glint }: { glint: THREE.Texture }) {
  const map = getTextures().panels.map;
  return (
    <mesh rotation-x={-Math.PI / 2 + 0.12} position={[0, 0.06, -0.38]}>
      <planeGeometry args={[BUILDING.w - 0.35, 0.36]} />
      <meshStandardMaterial
        map={map}
        emissiveMap={glint}
        emissive="#ffffff"
        emissiveIntensity={1.6}
        metalness={0.6}
        roughness={0.25}
      />
    </mesh>
  );
}

const goldMaterial = new THREE.MeshStandardMaterial({
  color: GOLD,
  metalness: 1,
  roughness: 0.26,
  envMapIntensity: 1.4,
});
const goldHover = new THREE.MeshStandardMaterial({
  color: "#E7C987",
  metalness: 1,
  roughness: 0.18,
  emissive: "#7a5a1e",
  emissiveIntensity: 0.6,
  envMapIntensity: 1.6,
});

function RoofLetter({ char, hovered }: { char: string; hovered: boolean }) {
  return (
    <group rotation-x={-Math.PI / 2}>
      <Center disableZ>
        <Text3D
          font={FONT_URL}
          size={0.62}
          height={0.14}
          curveSegments={4}
          bevelEnabled
          bevelThickness={0.02}
          bevelSize={0.012}
          bevelSegments={2}
          material={hovered ? goldHover : goldMaterial}
        >
          {char}
        </Text3D>
      </Center>
    </group>
  );
}

// ---------------------------------------------------------------- the 32 future blocks

const silhouetteMaterial = new THREE.MeshStandardMaterial({
  color: "#e6ecf7",
  emissive: GOLD,
  emissiveIntensity: 0.12,
  transparent: true,
  opacity: 0.32,
  depthWrite: false,
  roughness: 0.6,
});

/** Semi-transparent blocks that "build themselves" as `progress` goes 0 → 1. */
export function FutureBlocks({ progress }: { progress: RefObject<number> }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const last = useRef(-1);
  const order = useMemo(
    () =>
      FUTURE_BLOCKS.map((b, i) => ({ ...b, i, d: Math.hypot(b.x, b.z * 1.4) })).sort(
        (a, b) => a.d - b.d,
      ),
    [],
  );

  useFrame(() => {
    const p = progress.current ?? 0;
    if (Math.abs(p - last.current) < 0.0005 || !mesh.current) return;
    last.current = p;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const v = new THREE.Vector3();
    order.forEach((b, rank) => {
      const begin = 0.15 + (rank / order.length) * 0.6;
      const k = easeOutCubic(clamp01((p - begin) / 0.18));
      s.set(1, Math.max(0.001, k), 1);
      v.set(b.x, 0, b.z);
      m.compose(v, q, s);
      mesh.current!.setMatrixAt(b.i, m);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[boxGeometry(), silhouetteMaterial, FUTURE_BLOCKS.length]}
      frustumCulled={false}
    />
  );
}

export { BLOCKS };

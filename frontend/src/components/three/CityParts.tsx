"use client";

import { Center, Text3D } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import {
  BUILDING,
  clamp01,
  easeOutBack,
  easeOutCubic,
  PLOT,
  treePositions,
  type BlockSpot,
} from "./layout";
import { getTextures } from "./textures";

const FONT_URL = "/fonts/zarafshon-letters.typeface.json";
const GOLD = "#C9A45C";

// ---------------------------------------------------------------- ground & streets

export function Ground() {
  const road = PLOT.x + 0.85;
  const roadZ = PLOT.z + 0.75;
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color="#b9ac8e" roughness={1} />
      </mesh>
      {/* Paved plot, courtyard lawn between the blocks */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, 0]}>
        <planeGeometry args={[PLOT.x * 2, PLOT.z * 2]} />
        <meshStandardMaterial color="#d3c9b0" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 0]}>
        <planeGeometry args={[BUILDING.w + 0.6, 1.5]} />
        <meshStandardMaterial color="#7d9858" roughness={1} />
      </mesh>
      {/* Perimeter streets */}
      {(
        [
          [0, -roadZ, road * 2 + 0.8, 0.8],
          [0, roadZ, road * 2 + 0.8, 0.8],
          [-road, 0, 0.8, roadZ * 2],
          [road, 0, 0.8, roadZ * 2],
        ] as const
      ).map(([x, z, w, d], i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[x, 0.006, z]}>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial color="#454a57" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- trees (instanced)

const FOLIAGE = ["#5f7d45", "#6d8b4c", "#4f6c3d", "#7a9455"].map((c) => new THREE.Color(c));

export function Trees({ count }: { count: number }) {
  const crowns = useRef<THREE.InstancedMesh>(null);
  const trunks = useRef<THREE.InstancedMesh>(null);
  const positions = useMemo(() => treePositions(count), [count]);

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
      />
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
          size={0.95}
          height={0.16}
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

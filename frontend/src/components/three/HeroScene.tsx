"use client";

import {
  ContactShadows,
  Environment,
  Html,
  Lightformer,
  OrbitControls,
  PerformanceMonitor,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { setCursor } from "@/components/motion/Cursor";

import { Building, Ground, Trees } from "./CityParts";
import { BLOCKS, BUILDING, type BlockSpot } from "./layout";

export type HeroSceneProps = {
  active: boolean;
  /** Seconds to wait before the buildings start growing (preloader still on screen). */
  introDelay: number;
  tooltip: (letter: string) => string;
  sceneLabel: string;
  onBlockSelect: (letter: string) => void;
  onReady?: () => void;
};

const CAMERA_HOME = new THREE.Vector3(7.5, 7.8, 12);

export default function HeroScene(props: HeroSceneProps) {
  const [dpr, setDpr] = useState(1.5);
  const [shadows, setShadows] = useState(true);

  return (
    <div
      // Touch screens: the canvas wrapper gets touch-action: none (inline, from the 3D
      // controls), which blocks page scrolling over the scene. Vertical swipes scroll the
      // page; horizontal swipes still turn the model. No effect on mouse input.
      className="absolute inset-0 [&>div]:!touch-pan-y"
      role="img"
      aria-label={props.sceneLabel}
    >
      <Canvas
        frameloop={props.active ? "always" : "never"}
        dpr={dpr}
        camera={{ position: CAMERA_HOME.toArray(), fov: 30, near: 0.5, far: 120 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          requestAnimationFrame(() => props.onReady?.());
        }}
      >
        <PerformanceMonitor
          onDecline={() => {
            setDpr(1);
            setShadows(false);
          }}
        />
        <fog attach="fog" args={["#2b3046", 26, 62]} />
        <Lights />
        <City {...props} shadows={shadows} />
      </Canvas>
    </div>
  );
}

function Lights() {
  return (
    <>
      <hemisphereLight args={["#9fb3e6", "#5a4630", 0.55]} />
      <directionalLight position={[-12, 7, -6]} intensity={2.6} color="#ffb072" />
      <directionalLight position={[8, 10, 10]} intensity={0.55} color="#c9d6ff" />
      {/* "Sunset" reflections generated in-scene: no HDR download. */}
      <Environment resolution={128} frames={1}>
        <Lightformer
          form="rect"
          intensity={5}
          color="#ff9e5e"
          position={[-10, 3, -8]}
          scale={[16, 5, 1]}
        />
        <Lightformer form="circle" intensity={2.4} color="#ffe2b0" position={[2, 8, 8]} scale={5} />
        <Lightformer
          form="rect"
          intensity={1.2}
          color="#8aa2dc"
          position={[10, 6, 2]}
          scale={[10, 4, 1]}
        />
        <Lightformer
          form="rect"
          intensity={0.6}
          color="#ffffff"
          rotation-x={Math.PI / 2}
          position={[0, 12, 0]}
          scale={[30, 30, 1]}
        />
      </Environment>
    </>
  );
}

function City({
  introDelay,
  tooltip,
  onBlockSelect,
  shadows,
}: HeroSceneProps & { shadows: boolean }) {
  const group = useRef<THREE.Group>(null);
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const [hovered, setHovered] = useState<string | null>(null);
  const [introDone, setIntroDone] = useState(false);
  const flight = useRef<{
    target: BlockSpot;
    t: number;
    from: THREE.Vector3;
    look: THREE.Vector3;
  } | null>(null);

  const lastGrow = introDelay + 0.12 + (BLOCKS.length - 1) * 0.085 + 0.95;
  useEffect(() => {
    const id = window.setTimeout(() => setIntroDone(true), (lastGrow + 1.4) * 1000);
    return () => window.clearTimeout(id);
  }, [lastGrow]);

  useFrame((state, delta) => {
    // Mouse parallax: tilt the whole квартал slightly towards the pointer.
    if (group.current && !flight.current) {
      group.current.rotation.x = THREE.MathUtils.damp(
        group.current.rotation.x,
        -state.pointer.y * 0.035,
        3,
        delta,
      );
      group.current.rotation.z = THREE.MathUtils.damp(
        group.current.rotation.z,
        state.pointer.x * 0.025,
        3,
        delta,
      );
    }
    // Camera fly-to after a click on a block
    const f = flight.current;
    if (f && controls.current) {
      f.t = Math.min(1, f.t + delta / 1.1);
      const k = 1 - Math.pow(1 - f.t, 3);
      // Approach from the block's outer side so the other block never hides it.
      const side = Math.sign(f.target.z) || 1;
      const dest = new THREE.Vector3(f.target.x + 2.4, BUILDING.h + 3, f.target.z + side * 5.6);
      camera.position.lerpVectors(f.from, dest, k);
      controls.current.target.lerpVectors(
        f.look,
        new THREE.Vector3(f.target.x, BUILDING.h * 0.6, f.target.z),
        k,
      );
      controls.current.update();
    }
  });

  function select(spot: BlockSpot) {
    if (flight.current || !controls.current) return;
    setCursor(null);
    controls.current.autoRotate = false;
    controls.current.enabled = false;
    flight.current = {
      target: spot,
      t: 0,
      from: camera.position.clone(),
      look: controls.current.target.clone(),
    };
    window.setTimeout(() => onBlockSelect(spot.letter), 650);
  }

  return (
    <>
      <OrbitControls
        ref={controls}
        makeDefault
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.45}
        autoRotate={!hovered}
        autoRotateSpeed={0.35}
        minPolarAngle={0.55}
        maxPolarAngle={1.12}
        target={[0, 0.6, 0]}
      />
      <group ref={group}>
        <Ground />
        <Trees count={140} />
        {BLOCKS.map((spot) => (
          <Building
            key={spot.letter}
            spot={spot}
            growAt={introDelay + 0.12 + spot.index * 0.085}
            letterAt={lastGrow + 0.05 + spot.index * 0.05}
            hovered={hovered === spot.letter}
            onOver={(e) => {
              e.stopPropagation();
              setHovered(spot.letter);
              setCursor("view");
            }}
            onOut={() => {
              setHovered((h) => (h === spot.letter ? null : h));
              setCursor(null);
            }}
            onClick={(e) => {
              e.stopPropagation();
              select(spot);
            }}
          />
        ))}
        {hovered && (
          <BlockTooltip spot={BLOCKS.find((b) => b.letter === hovered)!} text={tooltip(hovered)} />
        )}
        {shadows && (
          <ContactShadows
            position={[0, 0.012, 0]}
            scale={34}
            far={4}
            blur={2.2}
            opacity={0.55}
            resolution={512}
            color="#1b1408"
            frames={introDone ? 1 : Infinity}
          />
        )}
      </group>
    </>
  );
}

function BlockTooltip({ spot, text }: { spot: BlockSpot; text: string }) {
  return (
    <Html
      position={[spot.x, BUILDING.h + 1.1, spot.z]}
      center
      pointerEvents="none"
      zIndexRange={[20, 0]}
    >
      <div className="pointer-events-none rounded-full border border-gold/40 bg-ink/85 px-4 py-2 text-sm font-semibold whitespace-nowrap text-white shadow-lift backdrop-blur-md">
        <span className="mr-2 inline-block size-2 rounded-full bg-gold align-middle" />
        {text}
      </div>
    </Html>
  );
}

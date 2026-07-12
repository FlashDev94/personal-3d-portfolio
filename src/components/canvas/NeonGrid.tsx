import React, { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Preload } from "@react-three/drei";
import type { Group } from "three";
import * as THREE from "three";

import CanvasLoader from "../layout/Loader";
import ErrorBoundary from "../layout/ErrorBoundary";

type NeonGridProps = {
  accent?: string;
  autoRotate?: boolean;
  motionSpeed?: number;
  allowOrbit?: boolean;
  dpr?: [number, number];
  antialias?: boolean;
};

const GridWorld: React.FC<{
  accent: string;
  autoRotate: boolean;
  motionSpeed: number;
}> = ({ accent, autoRotate, motionSpeed }) => {
  const group = useRef<Group>(null);

  const grid = useMemo(() => {
    const size = 20;
    const divisions = 20;
    return new THREE.GridHelper(size, divisions, accent, "#1e1b2e");
  }, [accent]);

  useFrame((_state, delta) => {
    if (!autoRotate || !group.current) return;
    group.current.rotation.y += delta * 0.12 * (motionSpeed || 1);
  });

  return (
    <group ref={group} position={[0, -1.2, 0]} rotation={[0.15, 0, 0]}>
      <primitive object={grid} />
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.35}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <octahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial color="#ffffff" metalness={0.7} roughness={0.2} />
      </mesh>
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 8, 2]} intensity={0.9} />
      <pointLight position={[0, 2, 2]} intensity={0.8} color={accent} />
      <fog attach="fog" args={["#050816", 6, 22]} />
    </group>
  );
};

const NeonGridCanvas: React.FC<NeonGridProps> = ({
  accent = "#22d3ee",
  autoRotate = true,
  motionSpeed = 1,
  allowOrbit = true,
  dpr = [1, 1.5],
  antialias = true,
}) => {
  return (
    <ErrorBoundary
      name="Neon grid"
      fallback={<div className="h-full w-full" aria-hidden />}
    >
      <div className="h-full w-full">
        <Canvas
          frameloop={autoRotate ? "always" : "demand"}
          dpr={dpr}
          gl={{
            antialias,
            alpha: true,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false,
          }}
          camera={{ position: [0, 2.5, 8], fov: 45 }}
          style={{ width: "100%", height: "100%", background: "transparent" }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
          }}
        >
          <Suspense fallback={<CanvasLoader />}>
            <OrbitControls
              enablePan={false}
              enableZoom={false}
              enableRotate={allowOrbit}
              maxPolarAngle={Math.PI / 2.1}
              minPolarAngle={Math.PI / 3.5}
            />
            <GridWorld
              accent={accent}
              autoRotate={autoRotate}
              motionSpeed={motionSpeed}
            />
            <Preload all />
          </Suspense>
        </Canvas>
      </div>
    </ErrorBoundary>
  );
};

export default NeonGridCanvas;

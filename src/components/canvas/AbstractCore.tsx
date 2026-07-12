import React, { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, Preload } from "@react-three/drei";
import type { Mesh } from "three";

import CanvasLoader from "../layout/Loader";
import ErrorBoundary from "../layout/ErrorBoundary";

type AbstractCoreProps = {
  accent?: string;
  autoRotate?: boolean;
  motionSpeed?: number;
  allowOrbit?: boolean;
  dpr?: [number, number];
  antialias?: boolean;
  scale?: number;
};

const CoreMesh: React.FC<{
  accent: string;
  autoRotate: boolean;
  motionSpeed: number;
  scale: number;
}> = ({ accent, autoRotate, motionSpeed, scale }) => {
  const outer = useRef<Mesh>(null);
  const inner = useRef<Mesh>(null);

  useFrame((_state, delta) => {
    if (!autoRotate) return;
    const s = motionSpeed || 1;
    if (outer.current) {
      outer.current.rotation.x += delta * 0.15 * s;
      outer.current.rotation.y += delta * 0.25 * s;
    }
    if (inner.current) {
      inner.current.rotation.y -= delta * 0.4 * s;
      inner.current.rotation.z += delta * 0.2 * s;
    }
  });

  return (
    <Float
      speed={autoRotate ? 1.2 * (motionSpeed || 1) : 0}
      rotationIntensity={autoRotate ? 0.4 : 0}
      floatIntensity={autoRotate ? 0.6 : 0}
    >
      <group scale={scale}>
        <mesh ref={outer}>
          <torusGeometry args={[1.35, 0.06, 16, 64]} />
          <meshStandardMaterial color={accent} metalness={0.6} roughness={0.25} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0.4, 0]}>
          <torusGeometry args={[1.05, 0.04, 12, 48]} />
          <meshStandardMaterial
            color="#ffffff"
            metalness={0.4}
            roughness={0.35}
            transparent
            opacity={0.55}
          />
        </mesh>
        <mesh ref={inner}>
          <icosahedronGeometry args={[0.7, 1]} />
          <meshStandardMaterial
            color={accent}
            flatShading
            metalness={0.35}
            roughness={0.4}
          />
        </mesh>
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 4, 2]} intensity={1.1} color="#ffffff" />
        <pointLight position={[-3, -1, -2]} intensity={0.6} color={accent} />
      </group>
    </Float>
  );
};

const AbstractCoreCanvas: React.FC<AbstractCoreProps> = ({
  accent = "#915EFF",
  autoRotate = true,
  motionSpeed = 1,
  allowOrbit = true,
  dpr = [1, 1.5],
  antialias = true,
  scale = 1.1,
}) => {
  return (
    <ErrorBoundary
      name="Abstract core"
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
          camera={{ position: [0, 0, 5], fov: 42 }}
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
              autoRotate={autoRotate}
              autoRotateSpeed={0.6 * motionSpeed}
            />
            <CoreMesh
              accent={accent}
              autoRotate={autoRotate}
              motionSpeed={motionSpeed}
              scale={scale}
            />
            <Preload all />
          </Suspense>
        </Canvas>
      </div>
    </ErrorBoundary>
  );
};

export default AbstractCoreCanvas;

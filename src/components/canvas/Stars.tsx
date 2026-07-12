import React, { memo, useMemo, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial, Preload } from "@react-three/drei";
import { random } from "maath";
import type { Points as ThreePoints } from "three";

import ErrorBoundary from "../layout/ErrorBoundary";

export type StarsCanvasProps = {
  color?: string;
  particleCount?: number;
  motionSpeed?: number;
  animate?: boolean;
  dpr?: [number, number];
};

const Stars = ({
  color = "#f272c8",
  particleCount = 1500,
  motionSpeed = 1,
  animate = true,
}: {
  color?: string;
  particleCount?: number;
  motionSpeed?: number;
  animate?: boolean;
}) => {
  const ref = useRef<ThreePoints>(null);

  // Length must be divisible by 3 (xyz). Clamp for performance.
  const count = Math.max(200, Math.min(4000, Math.round(particleCount)));
  const sphere = useMemo(() => {
    const arr = new Float32Array(count * 3);
    random.inSphere(arr, { radius: 1.2 });
    return arr;
  }, [count]);

  useFrame((_state, delta) => {
    if (!animate || !ref.current) return;
    const s = motionSpeed || 1;
    ref.current.rotation.x -= (delta / 10) * s;
    ref.current.rotation.y -= (delta / 15) * s;
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled>
        <PointMaterial
          transparent
          color={color}
          size={0.002}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
    </group>
  );
};

const StarsCanvas: React.FC<StarsCanvasProps> = ({
  color = "#f272c8",
  particleCount = 1500,
  motionSpeed = 1,
  animate = true,
  dpr = [1, 1.5],
}) => {
  return (
    <ErrorBoundary
      name="Stars"
      fallback={<div className="absolute inset-0 z-[-1]" aria-hidden />}
    >
      <div className="absolute inset-0 z-[-1] h-auto w-full">
        <Canvas
          camera={{ position: [0, 0, 1] }}
          frameloop={animate ? "always" : "demand"}
          dpr={dpr}
          gl={{
            antialias: false,
            alpha: true,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false,
          }}
          style={{ background: "transparent" }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
          }}
        >
          <Suspense fallback={null}>
            <Stars
              color={color}
              particleCount={particleCount}
              motionSpeed={motionSpeed}
              animate={animate}
            />
          </Suspense>
          <Preload all />
        </Canvas>
      </div>
    </ErrorBoundary>
  );
};

export default memo(StarsCanvas);

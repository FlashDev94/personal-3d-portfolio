import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Preload, useGLTF } from "@react-three/drei";

import CanvasLoader from "../layout/Loader";
import ErrorBoundary from "../layout/ErrorBoundary";

export type EarthCanvasProps = {
  autoRotate?: boolean;
  motionSpeed?: number;
  allowOrbit?: boolean;
  dpr?: [number, number];
  antialias?: boolean;
};

const Earth = () => {
  const earth = useGLTF("./planet/scene.gltf");

  return (
    <primitive object={earth.scene} scale={2.5} position-y={0} rotation-y={0} />
  );
};

// Defer planet preload until contact section is near paint time
if (typeof window !== "undefined") {
  const preload = () => {
    try {
      useGLTF.preload("./planet/scene.gltf");
    } catch {
      /* ignore */
    }
  };
  const w = window as Window & {
    requestIdleCallback?: (
      cb: () => void,
      opts?: { timeout: number }
    ) => number;
  };
  if (typeof w.requestIdleCallback === "function") {
    w.requestIdleCallback(preload, { timeout: 4000 });
  } else {
    window.setTimeout(preload, 1200);
  }
}

const EarthCanvas: React.FC<EarthCanvasProps> = ({
  autoRotate = true,
  motionSpeed = 1,
  allowOrbit = true,
  dpr = [1, 1.5],
  antialias = true,
}) => {
  return (
    <ErrorBoundary name="Globe">
      <div className="h-full w-full">
        <Canvas
          shadows
          frameloop={autoRotate ? "always" : "demand"}
          dpr={dpr}
          gl={{
            preserveDrawingBuffer: true,
            antialias,
            alpha: true,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false,
          }}
          camera={{
            fov: 45,
            near: 0.1,
            far: 200,
            position: [-4, 3, 6],
          }}
          style={{ width: "100%", height: "100%", background: "transparent" }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
          }}
        >
          <Suspense fallback={<CanvasLoader />}>
            <OrbitControls
              autoRotate={autoRotate}
              autoRotateSpeed={motionSpeed}
              enablePan={false}
              enableZoom={false}
              enableRotate={allowOrbit}
              maxPolarAngle={Math.PI / 2}
              minPolarAngle={Math.PI / 2}
            />
            <Earth />
            <Preload all />
          </Suspense>
        </Canvas>
      </div>
    </ErrorBoundary>
  );
};

export default EarthCanvas;

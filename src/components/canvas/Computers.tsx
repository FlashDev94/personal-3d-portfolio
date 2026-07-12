import React, { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Preload, useGLTF } from "@react-three/drei";

import CanvasLoader from "../layout/Loader";
import ErrorBoundary from "../layout/ErrorBoundary";

export type ComputersCanvasProps = {
  autoRotate?: boolean;
  motionSpeed?: number;
  allowOrbit?: boolean;
  dpr?: [number, number];
  shadows?: boolean;
  antialias?: boolean;
  /** Force-show on small screens (default: hide on mobile). */
  forceMobile?: boolean;
};

const Computers: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
  const computer = useGLTF("./desktop_pc/scene.gltf");

  return (
    <group>
      <hemisphereLight intensity={0.15} groundColor="black" />
      <spotLight
        position={[-20, 50, 10]}
        angle={0.12}
        penumbra={1}
        intensity={1}
        castShadow
        shadow-mapSize={1024}
      />
      <pointLight intensity={1} />
      <primitive
        object={computer.scene}
        scale={isMobile ? 0.7 : 0.75}
        position={isMobile ? [0, -3, -2.2] : [0, -4.25, -1.5]}
        rotation={[-0.01, -0.2, -0.1]}
      />
    </group>
  );
};

// Defer GLTF preload until after first paint so boot/UI stays snappy
if (typeof window !== "undefined") {
  const preload = () => {
    try {
      useGLTF.preload("./desktop_pc/scene.gltf");
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
    w.requestIdleCallback(preload, { timeout: 2000 });
  } else {
    window.setTimeout(preload, 400);
  }
}

const ComputersCanvas: React.FC<ComputersCanvasProps> = ({
  autoRotate = false,
  motionSpeed = 1,
  allowOrbit = true,
  dpr = [1, 1.5],
  shadows = true,
  antialias = true,
  forceMobile = false,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [webglOk, setWebglOk] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 500px)");
    setIsMobile(mediaQuery.matches);

    const handleMediaQueryChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    mediaQuery.addEventListener("change", handleMediaQueryChange);
    return () => {
      mediaQuery.removeEventListener("change", handleMediaQueryChange);
    };
  }, []);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) setWebglOk(false);
    } catch {
      setWebglOk(false);
    }
  }, []);

  // Heavy GLTF stays off on narrow screens unless explicitly forced
  if ((!forceMobile && isMobile) || !webglOk) {
    return null;
  }

  return (
    <ErrorBoundary
      name="Hero 3D"
      fallback={
        <div className="pointer-events-none absolute inset-0" aria-hidden />
      }
    >
      <div className="absolute inset-0 h-full w-full">
        <Canvas
          frameloop={autoRotate ? "always" : "demand"}
          shadows={shadows}
          dpr={dpr}
          camera={{ position: [20, 3, 5], fov: 25 }}
          gl={{
            preserveDrawingBuffer: true,
            antialias,
            alpha: true,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false,
          }}
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
              autoRotateSpeed={0.5 * motionSpeed}
              maxPolarAngle={Math.PI / 2}
              minPolarAngle={Math.PI / 2}
            />
            <Computers isMobile={isMobile} />
          </Suspense>
          <Preload all />
        </Canvas>
      </div>
    </ErrorBoundary>
  );
};

export default ComputersCanvas;

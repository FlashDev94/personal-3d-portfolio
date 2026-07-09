import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Decal,
  Float,
  OrbitControls,
  Preload,
  useTexture,
} from "@react-three/drei";

import CanvasLoader from "../layout/Loader";
import ErrorBoundary from "../layout/ErrorBoundary";

const Ball = (props: { imgUrl: string }) => {
  const [decal] = useTexture([props.imgUrl]);

  return (
    <Float speed={1.75} rotationIntensity={1} floatIntensity={2}>
      <ambientLight intensity={0.25} />
      <directionalLight position={[0, 0, 0.05]} />
      <mesh castShadow receiveShadow scale={2.75}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color="#fff8eb"
          polygonOffset
          polygonOffsetFactor={-5}
          flatShading
        />
        <Decal
          position={[0, 0, 1]}
          rotation={[2 * Math.PI, 0, 6.25]}
          scale={1}
          map={decal}
          // @ts-expect-error drei Decal flatShading
          flatShading
        />
      </mesh>
    </Float>
  );
};

/** 2D fallback — used when WebGL is unavailable or icon is an SVG data URL. */
export const TechIconBall: React.FC<{ icon: string; name?: string }> = ({
  icon,
  name,
}) => (
  <div
    className="flex h-full w-full items-center justify-center rounded-full border border-white/10"
    style={{
      background:
        "radial-gradient(circle at 30% 25%, #2a2540 0%, #151030 55%, #0b0918 100%)",
    }}
    title={name}
  >
    <img
      src={icon}
      alt={name || "tech"}
      className="h-[55%] w-[55%] object-contain"
      draggable={false}
    />
  </div>
);

function isSvgDataUrl(url: string): boolean {
  return (
    url.startsWith("data:image/svg+xml") ||
    url.includes("image/svg+xml") ||
    url.endsWith(".svg")
  );
}

/**
 * Optional 3D ball. Prefer Tech section CSS balls to avoid WebGL context exhaustion.
 * Kept for configurator previews / single-use cases.
 */
const BallCanvas: React.FC<{ icon: string; name?: string }> = ({
  icon,
  name,
}) => {
  // SVG data URLs often fail in useTexture — use 2D fallback
  if (isSvgDataUrl(icon)) {
    return <TechIconBall icon={icon} name={name} />;
  }

  return (
    <ErrorBoundary
      name="Skill ball"
      fallback={<TechIconBall icon={icon} name={name} />}
    >
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        gl={{
          preserveDrawingBuffer: true,
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          failIfMajorPerformanceCaveat: false,
        }}
        style={{ background: "transparent" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <Suspense fallback={<CanvasLoader />}>
          <OrbitControls enablePan={false} enableZoom={false} />
          <Ball imgUrl={icon} />
        </Suspense>
        <Preload all />
      </Canvas>
    </ErrorBoundary>
  );
};

export default BallCanvas;

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Preload, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import CanvasLoader from "../layout/Loader";
import ErrorBoundary from "../layout/ErrorBoundary";
import { useMotionPolicy } from "../../utils/motionRuntime";

gsap.registerPlugin(ScrollTrigger);

type StageProps = {
  dpr?: [number, number];
  shadows?: boolean;
  antialias?: boolean;
  motionSpeed?: number;
};

/**
 * Fixed lead-actor stage. Camera + model only — never hides page content.
 */
function StageModel({
  mouse,
  scroll,
}: {
  mouse: React.MutableRefObject<{ x: number; y: number }>;
  scroll: React.MutableRefObject<number>;
}) {
  const group = useRef<THREE.Group>(null);
  const computer = useGLTF("./desktop_pc/scene.gltf");
  const { camera } = useThree();

  const keys = useMemo(
    () => ({
      pos: [
        new THREE.Vector3(0, 1.15, 13.5),
        new THREE.Vector3(0.3, 1.8, 17),
        new THREE.Vector3(0.15, 2.6, 22),
      ],
      look: [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.15, 0.3, 0),
        new THREE.Vector3(0, 0.5, 0),
      ],
    }),
    []
  );
  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpLook = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!group.current) return;
    const t = THREE.MathUtils.clamp(scroll.current, 0, 1);
    const mx = mouse.current.x;
    const my = mouse.current.y;

    const seg = t < 0.5 ? 0 : 1;
    const local = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    tmpPos.lerpVectors(keys.pos[seg], keys.pos[seg + 1], local);
    tmpLook.lerpVectors(keys.look[seg], keys.look[seg + 1], local);
    camera.position.lerp(tmpPos, 0.08);
    camera.lookAt(tmpLook);

    const yaw = 0.12 + t * 0.7 + mx * 0.35;
    const pitch = -0.04 + my * 0.12 + t * 0.08;
    group.current.rotation.y = THREE.MathUtils.lerp(
      group.current.rotation.y,
      yaw,
      0.08
    );
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      pitch,
      0.08
    );
    group.current.position.x = THREE.MathUtils.lerp(
      group.current.position.x,
      t < 0.5 ? THREE.MathUtils.lerp(0, -1.1, t * 2) : -1.1,
      0.06
    );
    group.current.position.y = THREE.MathUtils.lerp(
      group.current.position.y,
      t > 0.6 ? THREE.MathUtils.lerp(-2.15, -3.2, (t - 0.6) / 0.4) : -2.15,
      0.06
    );
  });

  return (
    <group ref={group} scale={0.68} position={[0, -2.15, 0]}>
      <hemisphereLight intensity={0.22} groundColor="black" />
      <spotLight
        position={[-16, 40, 12]}
        angle={0.14}
        penumbra={1}
        intensity={1.1}
        castShadow
        shadow-mapSize={1024}
      />
      <pointLight intensity={1} position={[4, 6, 4]} />
      <primitive object={computer.scene} />
    </group>
  );
}

const CharacterStage = ({
  dpr = [1, 1.5],
  shadows = true,
  antialias = true,
}: StageProps) => {
  const policy = useMotionPolicy();
  const mouse = useRef({ x: 0, y: 0 });
  const scroll = useRef(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!policy.allowWebGL || !policy.isDesktop) return;

    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    let st: ScrollTrigger | null = null;
    if (policy.allowScrub) {
      st = ScrollTrigger.create({
        id: "character-stage-scroll",
        trigger: ".landing-section",
        start: "top top",
        endTrigger: ".whatIDO",
        end: "bottom top",
        scrub: true,
        onUpdate: (self) => {
          scroll.current = self.progress;
        },
      });
    }

    return () => {
      window.removeEventListener("mousemove", onMove);
      st?.kill();
    };
  }, [policy.allowWebGL, policy.isDesktop, policy.allowScrub]);

  if (!policy.allowWebGL || !policy.isDesktop || !mounted) {
    return null;
  }

  return (
    <div
      className="character-model-fixed character-stage pointer-events-none fixed inset-0 z-[1] hidden lg:block"
      aria-hidden
    >
      <ErrorBoundary
        name="Character stage"
        fallback={<div className="h-full w-full" aria-hidden />}
      >
        <Canvas
          shadows={shadows}
          dpr={dpr}
          gl={{ antialias, alpha: true, powerPreference: "high-performance" }}
          camera={{ fov: 28, near: 0.1, far: 200, position: [0, 1.15, 13.5] }}
          style={{ width: "100%", height: "100%", background: "transparent" }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
          }}
        >
          <Suspense fallback={<CanvasLoader />}>
            <StageModel mouse={mouse} scroll={scroll} />
            <Preload all />
          </Suspense>
        </Canvas>
      </ErrorBoundary>
      <div
        className="character-rim pointer-events-none absolute bottom-[6%] left-1/2 h-20 w-[50%] -translate-x-1/2 rounded-[100%] opacity-50 blur-2xl"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--accentColor, #5eead4) 0%, transparent 70%)",
        }}
      />
    </div>
  );
};

useGLTF.preload("./desktop_pc/scene.gltf");

export default CharacterStage;

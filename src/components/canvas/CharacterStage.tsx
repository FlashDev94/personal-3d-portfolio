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
 * Fixed lead-actor stage (desktop_pc as stand-in for encrypted character mesh).
 * Scroll progress is multi-segment like akashrmalhotra GsapScroll.setCharTimeline:
 *   landing → about → whatIDO, with mouse look on yaw/pitch.
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

  // Camera keyframes: landing → about → what-i-do (progress 0..1)
  const keys = useMemo(
    () => ({
      pos: [
        new THREE.Vector3(0, 1.15, 13.5),
        new THREE.Vector3(0.4, 2.1, 18),
        new THREE.Vector3(0.2, 3.2, 26),
      ],
      look: [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.2, 0.4, 0),
        new THREE.Vector3(0, 0.8, 0),
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

    // Two-segment lerp across 3 keys
    const seg = t < 0.5 ? 0 : 1;
    const local = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    const a = keys.pos[seg];
    const b = keys.pos[seg + 1];
    const la = keys.look[seg];
    const lb = keys.look[seg + 1];
    tmpPos.lerpVectors(a, b, local);
    tmpLook.lerpVectors(la, lb, local);

    camera.position.lerp(tmpPos, 0.08);
    camera.lookAt(tmpLook);

    // Model pose — yaw increases through scroll; mouse steers
    const yaw = 0.12 + t * 0.85 + mx * 0.4;
    const pitch = -0.04 + my * 0.14 + t * 0.1;
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

    // Slide left through about (matches reference character-model x)
    const targetX = t < 0.45 ? THREE.MathUtils.lerp(0, -1.4, t / 0.45) : -1.4;
    const targetY =
      t > 0.55
        ? THREE.MathUtils.lerp(-2.15, -3.8, (t - 0.55) / 0.45)
        : -2.15;
    group.current.position.x = THREE.MathUtils.lerp(
      group.current.position.x,
      targetX,
      0.06
    );
    group.current.position.y = THREE.MathUtils.lerp(
      group.current.position.y,
      targetY,
      0.06
    );
  });

  return (
    <group ref={group} scale={0.7} position={[0, -2.15, 0]}>
      <hemisphereLight intensity={0.2} groundColor="black" />
      <spotLight
        position={[-16, 40, 12]}
        angle={0.14}
        penumbra={1}
        intensity={1.15}
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

    const triggers: ScrollTrigger[] = [];
    if (policy.allowScrub) {
      // Map scroll from landing top → whatIDO bottom to 0..1
      const st = ScrollTrigger.create({
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
      triggers.push(st);

      // DOM transforms matching setCharTimeline content half
      const tl1 = gsap.timeline({
        scrollTrigger: {
          trigger: ".landing-section",
          start: "top top",
          end: "bottom top",
          scrub: true,
          id: "char-tl-landing",
          invalidateOnRefresh: true,
        },
      });
      tl1
        .fromTo(
          ".character-model-fixed",
          { x: "0%" },
          { x: "-22%", duration: 1 },
          0
        )
        .to(".landing-container", { opacity: 0, duration: 0.4 }, 0)
        .to(".landing-container", { y: "40%", duration: 0.8 }, 0)
        .fromTo(".about-me", { y: "-50%" }, { y: "0%" }, 0);

      const tl2 = gsap.timeline({
        scrollTrigger: {
          trigger: ".about-section",
          start: "center 55%",
          end: "bottom top",
          scrub: true,
          id: "char-tl-about",
          invalidateOnRefresh: true,
        },
      });
      tl2
        .to(".about-section", { y: "30%", duration: 6 }, 0)
        .to(".about-section", { opacity: 0, delay: 3, duration: 2 }, 0)
        .fromTo(
          ".character-model-fixed",
          { x: "-22%" },
          { x: "-10%", delay: 2, duration: 5 },
          0
        )
        .fromTo(
          ".character-rim",
          { opacity: 1, scaleX: 1.4 },
          { opacity: 0, scale: 0, y: "-70%", duration: 5, delay: 2 },
          0.3
        )
        .fromTo(
          ".what-box-in",
          { display: "none" },
          { display: "flex", duration: 0.1, delay: 5.5 },
          0
        );

      const tl3 = gsap.timeline({
        scrollTrigger: {
          trigger: ".whatIDO",
          start: "top top",
          end: "bottom top",
          scrub: true,
          id: "char-tl-what",
          invalidateOnRefresh: true,
        },
      });
      tl3
        .fromTo(
          ".character-model-fixed",
          { y: "0%" },
          { y: "-100%", duration: 4, ease: "none", delay: 1 },
          0
        )
        .fromTo(".whatIDO", { y: 0 }, { y: "15%", duration: 2 }, 0);
    }

    return () => {
      window.removeEventListener("mousemove", onMove);
      triggers.forEach((t) => t.kill());
      ScrollTrigger.getAll()
        .filter((t) => String(t.vars?.id || "").startsWith("char-tl-"))
        .forEach((t) => t.kill());
    };
  }, [policy.allowWebGL, policy.isDesktop, policy.allowScrub]);

  if (!policy.allowWebGL || !policy.isDesktop || !mounted) {
    return null;
  }

  return (
    <div
      className="character-model-fixed character-stage pointer-events-none fixed inset-0 z-[5] hidden lg:block"
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
      <div className="character-rim pointer-events-none absolute bottom-[8%] left-1/2 h-24 w-[55%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_center,var(--accentColor,#5eead4)_0%,transparent_70%)] opacity-60 blur-2xl" />
    </div>
  );
};

useGLTF.preload("./desktop_pc/scene.gltf");

export default CharacterStage;

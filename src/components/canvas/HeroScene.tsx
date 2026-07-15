import { useEffect, useState } from "react";
import { useTheme3d } from "../../context/PortfolioContext";
import { useThemeRuntime } from "../../utils/themeRuntime";
import ComputersCanvas from "./Computers";
import AbstractCoreCanvas from "./AbstractCore";
import NeonGridCanvas from "./NeonGrid";
import ErrorBoundary from "../layout/ErrorBoundary";

/**
 * Routes the hero 3D pack from theme settings.
 * Heavy GLTF packs stay desktop-only; light procedural packs respect mobile3d.
 */
const HeroScene = () => {
  const { theme3d } = useTheme3d();
  const runtime = useThemeRuntime(theme3d);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 500px)");
    const update = () => setIsNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (!runtime.webglEnabled || theme3d.heroScene === "none") {
    return null;
  }

  // Fixed scroll-led stage mounts at shell level (CharacterStagePortal).
  if (theme3d.heroScene === "character_stage") {
    return null;
  }

  const common = {
    autoRotate: runtime.autoRotate,
    motionSpeed: runtime.motionSpeed || 1,
    allowOrbit: runtime.allowOrbit,
    dpr: runtime.dpr,
    antialias: runtime.antialias,
  };

  // Heavy model: never on narrow screens
  if (theme3d.heroScene === "desktop_pc") {
    if (isNarrow) return null;
    return (
      <ErrorBoundary
        name="Hero PC"
        fallback={<div className="h-full w-full" aria-hidden />}
      >
        <ComputersCanvas
          {...common}
          shadows={runtime.shadows}
          forceMobile={false}
        />
      </ErrorBoundary>
    );
  }

  // Light packs: optional on mobile
  if (isNarrow && !theme3d.mobile3d) {
    return null;
  }

  if (theme3d.heroScene === "abstract_core") {
    return (
      <div className="absolute inset-0 h-full w-full">
        <AbstractCoreCanvas
          {...common}
          accent={runtime.palette.accent}
          scale={1.15}
        />
      </div>
    );
  }

  if (theme3d.heroScene === "neon_grid") {
    return (
      <div className="absolute inset-0 h-full w-full">
        <NeonGridCanvas {...common} accent={runtime.palette.accent} />
      </div>
    );
  }

  return null;
};

export default HeroScene;

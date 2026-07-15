import { lazy, Suspense } from "react";
import { useTheme3d } from "../../context/PortfolioContext";
import { useThemeRuntime } from "../../utils/themeRuntime";
import ErrorBoundary from "../layout/ErrorBoundary";

const CharacterStage = lazy(() => import("./CharacterStage"));

/**
 * Mounts the fixed character stage at the app shell so GSAP transforms on
 * landing containers cannot break position:fixed (same pattern as reference
 * Character model outside #smooth-content siblings).
 */
const CharacterStagePortal = ({ active }: { active: boolean }) => {
  const { theme3d } = useTheme3d();
  const runtime = useThemeRuntime(theme3d);

  if (
    !active ||
    !runtime.webglEnabled ||
    theme3d.heroScene !== "character_stage"
  ) {
    return null;
  }

  return (
    <ErrorBoundary
      name="Character stage portal"
      fallback={<div className="hidden" aria-hidden />}
    >
      <Suspense fallback={null}>
        <CharacterStage
          dpr={runtime.dpr}
          shadows={runtime.shadows}
          antialias={runtime.antialias}
          motionSpeed={runtime.motionSpeed || 1}
        />
      </Suspense>
    </ErrorBoundary>
  );
};

export default CharacterStagePortal;

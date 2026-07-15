import { lazy, Suspense, useCallback, useEffect, useState, memo } from "react";
import { BrowserRouter } from "react-router-dom";

import {
  PortfolioProvider,
  usePortfolio,
  useTheme3d,
} from "./context/PortfolioContext";
import ErrorBoundary from "./components/layout/ErrorBoundary";
import BootScreen from "./components/layout/BootScreen";
import { useThemeRuntime } from "./utils/themeRuntime";
import CustomCursor from "./components/motion/CustomCursor";
import SmoothScroll from "./components/motion/SmoothScroll";
import StoryLanding from "./components/story/StoryLanding";
import StoryNavbar from "./components/story/StoryNavbar";
import SocialRail from "./components/story/SocialRail";
import CharacterStagePortal from "./components/canvas/CharacterStagePortal";
import { useStoryScroll } from "./hooks/useStoryScroll";
import { useAkashIntro } from "./hooks/useAkashIntro";

/** Akash visual skin — CSS class names + Geist/cyan look. */
import "./skins/akash";

/** Below-the-fold story sections — split out of the critical path. */
const StoryAbout = lazy(() => import("./components/story/StoryAbout"));
const StoryWhatIDo = lazy(() => import("./components/story/StoryWhatIDo"));
const StoryCareer = lazy(() => import("./components/story/StoryCareer"));
const StoryWork = lazy(() => import("./components/story/StoryWork"));
const StoryTech = lazy(() => import("./components/story/StoryTech"));
const StoryContact = lazy(() => import("./components/story/StoryContact"));
const PortfolioConfigurator = lazy(
  () => import("./components/configurator/PortfolioConfigurator")
);

const SectionFallback = () => (
  <div className="mx-auto min-h-[12rem] max-w-7xl animate-pulse px-6 py-10">
    <div
      className="h-4 w-32 rounded"
      style={{ background: "var(--color-border, #333)" }}
    />
  </div>
);

/** Theme-only: boot accent. Isolated so content tree is not re-rendered. */
const BootScreenBridge = memo(function BootScreenBridge({
  ready,
  onFinished,
}: {
  ready: boolean;
  onFinished: () => void;
}) {
  const { theme3d } = useTheme3d();
  const runtime = useThemeRuntime(theme3d);
  return (
    <BootScreen
      ready={ready}
      accent={runtime.palette.accent}
      minDurationMs={650}
      onFinished={onFinished}
    />
  );
});

/**
 * Content shell — Akash MainContainer structure + our data platform.
 */
const PortfolioShell = () => {
  const { isHydrated } = usePortfolio();
  const { theme3d } = useTheme3d();
  const [bootDone, setBootDone] = useState(false);

  const onBootFinished = useCallback(() => setBootDone(true), []);
  useStoryScroll(bootDone);
  useAkashIntro(bootDone);

  // Mark html for skin-scoped global CSS + hero scene flag for scroll owners
  useEffect(() => {
    document.documentElement.classList.add("skin-akash-active");
    document.documentElement.dataset.heroScene = theme3d.heroScene;
    return () => {
      document.documentElement.classList.remove("skin-akash-active");
      delete document.documentElement.dataset.heroScene;
    };
  }, [theme3d.heroScene]);

  // Absolute fail-safe: never leave the portfolio invisible if boot hangs
  useEffect(() => {
    if (bootDone) return;
    const t = window.setTimeout(() => setBootDone(true), 10000);
    return () => window.clearTimeout(t);
  }, [bootDone]);

  return (
    <>
      {!bootDone && (
        <BootScreenBridge ready={isHydrated} onFinished={onBootFinished} />
      )}

      <BrowserRouter>
        <div
          className={`container-main skin-akash main-body ${
            bootDone ? "main-active" : ""
          }`}
          style={{
            opacity: bootDone ? undefined : 0,
            transition: "opacity 0.4s ease",
          }}
          aria-hidden={!bootDone}
        >
          <CustomCursor />
          <CharacterStagePortal active={bootDone} />
          <StoryNavbar />
          <SocialRail />
          <SmoothScroll enabled={bootDone}>
            <main className={`container-main ${bootDone ? "main-active" : ""}`}>
              <StoryLanding />
              <Suspense fallback={<SectionFallback />}>
                <StoryAbout />
              </Suspense>
              <Suspense fallback={<SectionFallback />}>
                <StoryWhatIDo />
              </Suspense>
              <Suspense fallback={<SectionFallback />}>
                <StoryCareer />
              </Suspense>
              <Suspense fallback={<SectionFallback />}>
                <StoryWork />
              </Suspense>
              <Suspense fallback={<SectionFallback />}>
                <StoryTech />
              </Suspense>
              <Suspense fallback={<SectionFallback />}>
                <StoryContact />
              </Suspense>
            </main>
          </SmoothScroll>
          {bootDone && (
            <Suspense fallback={null}>
              <PortfolioConfigurator />
            </Suspense>
          )}
        </div>
      </BrowserRouter>
    </>
  );
};

const App = () => {
  return (
    <ErrorBoundary
      name="App"
      fallback={
        <div className="bg-primary flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center text-fg">
          <p className="text-lg font-semibold">
            Something went wrong loading the portfolio.
          </p>
          <p className="text-sm text-secondary">
            Try a hard refresh. If it persists, clear site data for this origin.
          </p>
          <button
            type="button"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--accent)" }}
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      }
    >
      <PortfolioProvider>
        <PortfolioShell />
      </PortfolioProvider>
    </ErrorBoundary>
  );
};

export default App;

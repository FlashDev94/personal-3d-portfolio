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
  <div
    className="section-container"
    style={{ minHeight: "8rem", padding: "2rem 0", opacity: 0.5 }}
    aria-hidden
  />
);

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
 * Option C shell: Akash skin + fixed character stage.
 * Content is always in the DOM and visible after boot — motion only enhances.
 */
const PortfolioShell = () => {
  const { isHydrated } = usePortfolio();
  const { theme3d } = useTheme3d();
  const [bootDone, setBootDone] = useState(false);

  const onBootFinished = useCallback(() => setBootDone(true), []);
  useStoryScroll(bootDone);
  useAkashIntro(bootDone);

  useEffect(() => {
    document.documentElement.classList.add("skin-akash-active");
    document.documentElement.dataset.heroScene = theme3d.heroScene;
    document.documentElement.dataset.hybrid = "c";
    return () => {
      document.documentElement.classList.remove("skin-akash-active");
      delete document.documentElement.dataset.heroScene;
      delete document.documentElement.dataset.hybrid;
    };
  }, [theme3d.heroScene]);

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
          className="container-main skin-akash main-body"
          style={{
            visibility: bootDone ? "visible" : "hidden",
          }}
          aria-hidden={!bootDone}
        >
          <CustomCursor />
          {/* C-only: fixed scroll-led stage */}
          <CharacterStagePortal active={bootDone} />
          <StoryNavbar />
          <SocialRail />
          <SmoothScroll enabled={bootDone}>
            <main className="container-main">
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

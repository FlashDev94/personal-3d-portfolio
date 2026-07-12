import { lazy, Suspense, useCallback, useState } from "react";
import { BrowserRouter } from "react-router-dom";

import { Hero, Navbar } from "./components";
import { PortfolioProvider, usePortfolio } from "./context/PortfolioContext";
import ErrorBoundary from "./components/layout/ErrorBoundary";
import BootScreen from "./components/layout/BootScreen";
import herobg from "./assets/herobg.png";
import { useThemeRuntime } from "./utils/themeRuntime";

/** Below-the-fold sections — split out of the critical path. */
const About = lazy(() => import("./components/sections/About"));
const Experience = lazy(() => import("./components/sections/Experience"));
const Tech = lazy(() => import("./components/sections/Tech"));
const Works = lazy(() => import("./components/sections/Works"));
const Feedbacks = lazy(() => import("./components/sections/Feedbacks"));
const Contact = lazy(() => import("./components/sections/Contact"));
const StarsCanvas = lazy(() => import("./components/canvas/Stars"));
const PortfolioConfigurator = lazy(
  () => import("./components/configurator/PortfolioConfigurator")
);

const SectionFallback = () => (
  <div className="mx-auto min-h-[12rem] max-w-7xl animate-pulse px-6 py-10">
    <div
      className="h-4 w-32 rounded"
      style={{ background: "var(--color-border)" }}
    />
    <div
      className="mt-4 h-8 w-64 rounded"
      style={{ background: "var(--color-black-100)" }}
    />
    <div
      className="mt-6 h-24 w-full max-w-2xl rounded"
      style={{ background: "var(--color-border)" }}
    />
  </div>
);

const PortfolioShell = () => {
  const { data, isHydrated } = usePortfolio();
  const runtime = useThemeRuntime(data.theme3d);
  const [bootDone, setBootDone] = useState(false);

  const onBootFinished = useCallback(() => setBootDone(true), []);

  const showStars =
    bootDone && runtime.webglEnabled && data.theme3d.showStars;

  return (
    <>
      <BootScreen
        ready={isHydrated}
        accent={runtime.palette.accent}
        minDurationMs={650}
        onFinished={onBootFinished}
      />

      <BrowserRouter>
        <div
          className={`bg-primary relative z-0 min-h-screen transition-opacity duration-500 ${
            bootDone ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            className="relative bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${herobg})` }}
          >
            {/* Light mode wash softens the dark hero art */}
            <div
              className="pointer-events-none absolute inset-0 z-[1]"
              style={{ background: "var(--color-hero-wash)" }}
              aria-hidden
            />
            <div className="relative z-[2]">
              <Navbar />
              <Hero />
            </div>
          </div>

          <Suspense fallback={<SectionFallback />}>
            <About />
          </Suspense>
          <Suspense fallback={<SectionFallback />}>
            <Experience />
          </Suspense>
          <Suspense fallback={<SectionFallback />}>
            <Tech />
          </Suspense>
          <Suspense fallback={<SectionFallback />}>
            <Works />
          </Suspense>
          {data.testimonials.length > 0 && (
            <Suspense fallback={<SectionFallback />}>
              <Feedbacks />
            </Suspense>
          )}
          <div className="relative z-0">
            <Suspense fallback={<SectionFallback />}>
              <Contact />
            </Suspense>
            {showStars && (
              <ErrorBoundary
                name="Stars"
                fallback={<div className="absolute inset-0" aria-hidden />}
              >
                <Suspense fallback={null}>
                  <StarsCanvas
                    color={
                      data.theme3d.starsColor || runtime.palette.starsDefault
                    }
                    particleCount={runtime.particleCount}
                    motionSpeed={runtime.motionSpeed || 1}
                    animate={!runtime.reduceMotion}
                    dpr={runtime.dpr}
                  />
                </Suspense>
              </ErrorBoundary>
            )}
          </div>
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

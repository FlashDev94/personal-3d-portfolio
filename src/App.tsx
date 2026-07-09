import { BrowserRouter } from "react-router-dom";

import {
  About,
  Contact,
  Experience,
  Feedbacks,
  Hero,
  Navbar,
  Tech,
  Works,
  StarsCanvas,
} from "./components";
import { PortfolioProvider, usePortfolio } from "./context/PortfolioContext";
import PortfolioConfigurator from "./components/configurator/PortfolioConfigurator";
import ErrorBoundary from "./components/layout/ErrorBoundary";
import herobg from "./assets/herobg.png";

const PortfolioShell = () => {
  const { data, isHydrated } = usePortfolio();

  if (!isHydrated) {
    return (
      <div className="bg-primary flex min-h-screen items-center justify-center text-white">
        Loading portfolio…
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="bg-primary relative z-0 min-h-screen">
        <div
          className="bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${herobg})` }}
        >
          <Navbar />
          <Hero />
        </div>
        <About />
        <Experience />
        <Tech />
        <Works />
        {data.testimonials.length > 0 && <Feedbacks />}
        <div className="relative z-0">
          <Contact />
          <ErrorBoundary
            name="Stars"
            fallback={<div className="absolute inset-0" aria-hidden />}
          >
            <StarsCanvas />
          </ErrorBoundary>
        </div>
        <PortfolioConfigurator />
      </div>
    </BrowserRouter>
  );
};

const App = () => {
  return (
    <ErrorBoundary
      name="App"
      fallback={
        <div className="bg-primary flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center text-white">
          <p className="text-lg font-semibold">Something went wrong loading the portfolio.</p>
          <p className="text-sm text-secondary">
            Try a hard refresh. If it persists, clear site data for this origin.
          </p>
          <button
            type="button"
            className="rounded-xl bg-[#915EFF] px-4 py-2 text-sm font-semibold"
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

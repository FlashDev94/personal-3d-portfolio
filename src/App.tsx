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
      <div className="bg-primary relative z-0">
        <div className="bg-hero-pattern bg-cover bg-center bg-no-repeat">
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
          <StarsCanvas />
        </div>
        <PortfolioConfigurator />
      </div>
    </BrowserRouter>
  );
};

const App = () => {
  return (
    <PortfolioProvider>
      <PortfolioShell />
    </PortfolioProvider>
  );
};

export default App;

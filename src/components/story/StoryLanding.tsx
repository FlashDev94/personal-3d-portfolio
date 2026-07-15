import { lazy, PropsWithChildren, Suspense } from "react";
import { usePortfolio, useTheme3d } from "../../context/PortfolioContext";
import ErrorBoundary from "../layout/ErrorBoundary";

const HeroScene = lazy(() => import("../canvas/HeroScene"));

/**
 * Landing section matching akashrmalhotra/3d-portfolio DOM + CSS classes.
 * Content comes from PortfolioContext; structure matches Landing.tsx reference.
 */
const StoryLanding = ({ children }: PropsWithChildren) => {
  const { data } = usePortfolio();
  const { theme3d } = useTheme3d();
  const { config, services } = data;

  const nameParts = (config.hero.name || "Hello").trim().split(/\s+/);
  const first = nameParts[0] || "Hello";
  const rest = nameParts.slice(1).join(" ");

  const lineA = config.hero.p[0] || services[0]?.title || "Full-stack";
  const lineB = config.hero.p[1] || services[1]?.title || "Product";

  // Dual-role loop labels (short words work best with char stagger)
  const roleShortA = shortRole(lineA);
  const roleShortB = shortRole(lineB);

  return (
    <div className="landing-section" id="landingDiv">
      <div className="landing-container">
        <div className="landing-intro">
          <h2>Hello! I&apos;m</h2>
          <h1>
            {first.toUpperCase()}
            {rest ? (
              <>
                <br />
                <span>{rest.toUpperCase()}</span>
              </>
            ) : null}
          </h1>
        </div>
        <div className="landing-info">
          <h3>I build</h3>
          <h2 className="landing-info-h2">
            <div className="landing-h2-1">{roleShortA}</div>
            <div className="landing-h2-2">{roleShortB}</div>
          </h2>
          <h2>
            <div className="landing-h2-info">{roleShortA}</div>
            <div className="landing-h2-info-1">{roleShortB}</div>
          </h2>
        </div>
      </div>

      {/* Inline hero packs only — character_stage mounts fixed at shell (C) */}
      {theme3d.heroScene !== "character_stage" ? (
        <div className="story-hero-stage character-model" aria-hidden>
          <ErrorBoundary
            name="Story hero canvas"
            fallback={<div className="h-full w-full" aria-hidden />}
          >
            <Suspense fallback={<div className="h-full w-full" aria-hidden />}>
              <HeroScene />
            </Suspense>
          </ErrorBoundary>
        </div>
      ) : null}
      {children}
    </div>
  );
};

function shortRole(s: string): string {
  // Prefer first meaningful word, max ~14 chars for loop animation
  const cleaned = s.replace(/I build|production-ready|applications/gi, "").trim();
  const word = cleaned.split(/\s+/)[0] || s;
  return word.length > 16 ? word.slice(0, 14) : word;
}

export default StoryLanding;

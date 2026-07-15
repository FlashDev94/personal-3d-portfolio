import { lazy, PropsWithChildren, Suspense } from "react";
import { usePortfolio, useTheme3d } from "../../context/PortfolioContext";
import ErrorBoundary from "../layout/ErrorBoundary";

const HeroScene = lazy(() => import("../canvas/HeroScene"));

/**
 * Landing — Akash DOM classes. Inline 3D only when not character_stage (Option C).
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
  const roleShortA = shortRole(lineA);
  const roleShortB = shortRole(lineB);

  const useInlineHero = theme3d.heroScene !== "character_stage";

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

      {useInlineHero ? (
        <div className="story-hero-stage character-model" aria-hidden>
          <ErrorBoundary
            name="Story hero canvas"
            fallback={<div style={{ width: "100%", height: "100%" }} aria-hidden />}
          >
            <Suspense
              fallback={<div style={{ width: "100%", height: "100%" }} aria-hidden />}
            >
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
  const cleaned = s
    .replace(/I build|production-ready|applications/gi, "")
    .trim();
  const word = cleaned.split(/\s+/)[0] || s;
  return word.length > 16 ? word.slice(0, 14) : word;
}

export default StoryLanding;

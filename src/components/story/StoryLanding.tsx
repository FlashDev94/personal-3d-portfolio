import { lazy, Suspense, useEffect, useRef } from "react";
import { styles } from "../../constants/styles";
import { usePortfolio } from "../../context/PortfolioContext";
import ErrorBoundary from "../layout/ErrorBoundary";
import { useHeroIntroFx } from "../../hooks/useHeroIntroFx";
import gsap from "gsap";
import { useMotionPolicy } from "../../utils/motionRuntime";
import { splitChars } from "../../utils/splitTextDom";

const HeroScene = lazy(() => import("../canvas/HeroScene"));

/**
 * Full-viewport landing: large name, looping dual-line roles, 3D stage.
 */
const StoryLanding = () => {
  const { data } = usePortfolio();
  const { config, services } = data;
  const introRef = useRef<HTMLDivElement>(null);
  const loopARef = useRef<HTMLDivElement>(null);
  const loopBRef = useRef<HTMLDivElement>(null);
  const policy = useMotionPolicy();

  useHeroIntroFx(introRef, [config.hero.name]);

  const roleA =
    services[0]?.title || config.hero.p[0] || "Full-stack engineer";
  const roleB =
    services[1]?.title || config.hero.p[1] || "Product builder";

  useEffect(() => {
    if (!policy.allowIntroFx || !loopARef.current || !loopBRef.current) return;
    const a = splitChars(loopARef.current);
    const b = splitChars(loopBRef.current);
    gsap.set(b.chars, { y: 80, opacity: 0 });
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.2 });
    const delay = 3.2;
    tl.fromTo(
      a.chars,
      { y: 0, opacity: 1 },
      { y: -80, opacity: 0, stagger: 0.04, duration: 0.9, ease: "power3.inOut", delay }
    )
      .fromTo(
        b.chars,
        { y: 80, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.04, duration: 0.9, ease: "power3.inOut" },
        "<"
      )
      .to({}, { duration: delay })
      .to(b.chars, {
        y: -80,
        opacity: 0,
        stagger: 0.04,
        duration: 0.9,
        ease: "power3.inOut",
      })
      .fromTo(
        a.chars,
        { y: 80, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.04, duration: 0.9, ease: "power3.inOut" },
        "<"
      );
    return () => {
      tl.kill();
      a.revert();
      b.revert();
    };
  }, [policy.allowIntroFx, roleA, roleB]);

  const first = config.hero.name.split(/\s+/)[0] || config.hero.name;
  const rest = config.hero.name.split(/\s+/).slice(1).join(" ");

  return (
    <section
      className="story-landing relative mx-auto flex min-h-screen w-full max-w-[1920px] items-stretch overflow-hidden"
      id="landing"
    >
      <div
        ref={introRef}
        className={`story-landing-copy relative z-10 flex w-full flex-col justify-center gap-10 py-28 ${styles.paddingX} pointer-events-none lg:w-[52%]`}
      >
        <div>
          <h2 className="text-secondary text-lg font-medium sm:text-xl" data-split>
            Hello! I&apos;m
          </h2>
          <h1 className="mt-2 text-5xl font-black leading-[1.05] text-fg sm:text-7xl lg:text-8xl">
            <span data-split className="block">
              {first}
            </span>
            {rest ? (
              <span data-split className="block" style={{ color: "var(--accent)" }}>
                {rest}
              </span>
            ) : null}
          </h1>
        </div>

        <div className="max-w-md" data-intro-fade>
          <p className="text-secondary text-sm uppercase tracking-[0.2em]">
            I build
          </p>
          <div className="relative mt-2 h-[2.5rem] overflow-hidden text-2xl font-bold text-fg sm:h-[3rem] sm:text-3xl">
            <div ref={loopARef} className="absolute inset-0">
              {roleA}
            </div>
            <div ref={loopBRef} className="absolute inset-0">
              {roleB}
            </div>
          </div>
          <p className="text-secondary mt-4 max-w-sm text-[15px] leading-relaxed">
            {config.hero.p.filter(Boolean).join(" ")}
          </p>
        </div>

        <div data-intro-fade className="pointer-events-auto">
          <a
            href="#about"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-fg transition hover:border-[color:var(--accent)]"
            data-cursor="disable"
          >
            Scroll story
            <span aria-hidden>↓</span>
          </a>
        </div>
      </div>

      <div className="story-hero-stage absolute inset-0 z-0 lg:left-[40%]">
        <ErrorBoundary
          name="Story hero canvas"
          fallback={<div className="h-full w-full" aria-hidden />}
        >
          <Suspense fallback={<div className="h-full w-full" aria-hidden />}>
            <HeroScene />
          </Suspense>
        </ErrorBoundary>
      </div>
    </section>
  );
};

export default StoryLanding;

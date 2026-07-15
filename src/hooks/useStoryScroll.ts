import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionPolicy } from "../utils/motionRuntime";

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll storytelling. Progressive enhancement only — content stays readable
 * if GSAP/ScrollTrigger is off or fails.
 */
export function useStoryScroll(enabled: boolean) {
  const policy = useMotionPolicy();

  useEffect(() => {
    // Always keep critical blocks visible (CSS may also force this)
    document.querySelectorAll(".what-box-in").forEach((el) => {
      (el as HTMLElement).style.display = "flex";
    });
    document.querySelectorAll(".career-info-box, .career-timeline").forEach((el) => {
      (el as HTMLElement).style.opacity = "1";
    });

    if (!enabled || !policy.allowScrub) return;

    const ctx = gsap.context(() => {
      const charLed =
        document.documentElement.dataset.heroScene === "character_stage";

      // Soft landing parallax — do not fully zero opacity (keep readable mid-scroll)
      if (!charLed && document.querySelector(".landing-container")) {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: ".landing-section",
              start: "top top",
              end: "bottom top",
              scrub: true,
              id: "story-landing",
              invalidateOnRefresh: true,
            },
          })
          .to(".landing-container", { opacity: 0.15, y: "18%", duration: 1 }, 0);

        if (policy.isDesktop && document.querySelector(".story-hero-stage")) {
          gsap
            .timeline({
              scrollTrigger: {
                trigger: ".landing-section",
                start: "top top",
                end: "bottom top",
                scrub: true,
                id: "story-hero-shift",
                invalidateOnRefresh: true,
              },
            })
            .fromTo(
              ".story-hero-stage",
              { x: "0%" },
              { x: "-12%", duration: 1 },
              0
            );
        }
      }

      // About — gentle drift, never fully hide
      if (!charLed && document.querySelector(".about-section")) {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: ".about-section",
              start: "top 70%",
              end: "bottom top",
              scrub: true,
              id: "story-about",
              invalidateOnRefresh: true,
            },
          })
          .fromTo(
            ".about-me",
            { y: 24, opacity: 0.85 },
            { y: 0, opacity: 1, duration: 1 },
            0
          );
      }

      // Career timeline grow (boxes already visible)
      if (document.querySelector(".career-section")) {
        const careerTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: ".career-section",
            start: "top 55%",
            end: "80% center",
            scrub: true,
            id: "story-career",
            invalidateOnRefresh: true,
          },
        });
        careerTimeline.fromTo(
          ".career-timeline",
          { scaleY: 0.15 },
          { scaleY: 1, transformOrigin: "top center", duration: 0.6 },
          0
        );
      }
    });

    return () => {
      ctx.revert();
      ScrollTrigger.getAll()
        .filter((t) => String(t.vars?.id || "").startsWith("story-"))
        .forEach((t) => t.kill());
      // After teardown, restore visibility
      document.querySelectorAll(".what-box-in").forEach((el) => {
        (el as HTMLElement).style.display = "flex";
      });
    };
  }, [enabled, policy.allowScrub, policy.isDesktop]);
}

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionPolicy } from "../utils/motionRuntime";

gsap.registerPlugin(ScrollTrigger);

/**
 * Page-level scrub storytelling inspired by akashrmalhotra GsapScroll.
 * Targets class names used by story layout sections. Safe teardown on unmount.
 */
export function useStoryScroll(enabled: boolean) {
  const policy = useMotionPolicy();

  useEffect(() => {
    if (!enabled || !policy.allowScrub) return;

    const ctx = gsap.context(() => {
      const landing = document.querySelector(".story-landing-copy");
      const heroStage = document.querySelector(".story-hero-stage");
      const about = document.querySelector(".story-about");

      if (landing) {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: ".story-landing",
              start: "top top",
              end: "bottom top",
              scrub: true,
              id: "story-landing",
            },
          })
          .to(landing, { opacity: 0, y: "30%", duration: 1 }, 0);
      }

      if (heroStage && policy.isDesktop) {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: ".story-landing",
              start: "top top",
              end: "bottom top",
              scrub: true,
              id: "story-hero-stage",
            },
          })
          .to(heroStage, { x: "-18%", duration: 1 }, 0);
      }

      if (about) {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: ".story-about",
              start: "top 80%",
              end: "bottom top",
              scrub: true,
              id: "story-about",
            },
          })
          .fromTo(about, { y: 40, opacity: 0.4 }, { y: 0, opacity: 1, duration: 1 }, 0)
          .to(about, { y: "12%", opacity: 0.85, duration: 1 }, 0.6);
      }

      const careerLine = document.querySelector(".story-career-line");
      const careerItems = document.querySelectorAll(".story-career-item");
      if (careerLine || careerItems.length) {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: ".story-career",
            start: "top 60%",
            end: "bottom center",
            scrub: true,
            id: "story-career",
          },
        });
        if (careerLine) {
          tl.fromTo(
            careerLine,
            { scaleY: 0 },
            { scaleY: 1, transformOrigin: "top center", duration: 0.6 },
            0
          );
        }
        if (careerItems.length) {
          tl.fromTo(
            careerItems,
            { opacity: 0, x: -24 },
            { opacity: 1, x: 0, stagger: 0.08, duration: 0.5 },
            0.05
          );
        }
      }
    });

    return () => {
      ctx.revert();
      ScrollTrigger.getAll()
        .filter((t) => String(t.vars?.id || "").startsWith("story-"))
        .forEach((t) => t.kill());
    };
  }, [enabled, policy.allowScrub, policy.isDesktop]);
}

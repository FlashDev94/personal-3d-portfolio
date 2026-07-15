import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionPolicy } from "../utils/motionRuntime";

gsap.registerPlugin(ScrollTrigger);

/** Grow a vertical line / stagger children as the section enters view. */
export function useSectionScrub(
  sectionRef: RefObject<HTMLElement | null>,
  options?: { lineSelector?: string; itemSelector?: string }
) {
  const policy = useMotionPolicy();
  const lineSelector = options?.lineSelector ?? "[data-scrub-line]";
  const itemSelector = options?.itemSelector ?? "[data-scrub-item]";

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !policy.allowScrub) return;

    const ctx = gsap.context(() => {
      const line = section.querySelector(lineSelector);
      const items = section.querySelectorAll(itemSelector);

      if (line) {
        gsap.fromTo(
          line,
          { scaleY: 0, transformOrigin: "top center" },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top 70%",
              end: "bottom 40%",
              scrub: true,
            },
          }
        );
      }

      if (items.length) {
        gsap.fromTo(
          items,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.08,
            ease: "power2.out",
            scrollTrigger: {
              trigger: section,
              start: "top 75%",
              end: "center 55%",
              scrub: true,
            },
          }
        );
      }
    }, section);

    return () => {
      ctx.revert();
    };
  }, [policy.allowScrub, sectionRef, lineSelector, itemSelector]);
}

import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { splitChars } from "../utils/splitTextDom";
import { useMotionPolicy } from "../utils/motionRuntime";

/**
 * Char-stagger blur intro for hero title / subtitle.
 */
export function useHeroIntroFx(
  containerRef: RefObject<HTMLElement | null>,
  deps: unknown[] = []
) {
  const policy = useMotionPolicy();

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !policy.allowIntroFx) return;

    const targets = root.querySelectorAll<HTMLElement>("[data-split]");
    const splits: ReturnType<typeof splitChars>[] = [];
    const ctx = gsap.context(() => {
      targets.forEach((el, i) => {
        const split = splitChars(el);
        splits.push(split);
        gsap.fromTo(
          split.chars,
          { opacity: 0, y: 48, filter: "blur(6px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1.05,
            ease: "power3.out",
            stagger: 0.018,
            delay: 0.15 + i * 0.12,
          }
        );
      });

      const accent = root.querySelectorAll("[data-intro-fade]");
      gsap.fromTo(
        accent,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power2.out",
          stagger: 0.08,
          delay: 0.35,
        }
      );
    }, root);

    return () => {
      ctx.revert();
      splits.forEach((s) => s.revert());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policy.allowIntroFx, containerRef, ...deps]);
}

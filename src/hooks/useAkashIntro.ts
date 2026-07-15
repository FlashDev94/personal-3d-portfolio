import { useEffect } from "react";
import gsap from "gsap";
import { splitChars, type SplitResult } from "../utils/splitTextDom";
import { useMotionPolicy } from "../utils/motionRuntime";

/**
 * Boot intro FX ported from akashrmalhotra initialFX.
 * Uses our splitChars (no Club SplitText dependency).
 */
export function useAkashIntro(enabled: boolean) {
  const policy = useMotionPolicy();

  useEffect(() => {
    if (!enabled) return;

    // Always unhide chrome when boot finishes
    document
      .querySelectorAll(".header, .icons-section, .nav-fade")
      .forEach((el) => {
        (el as HTMLElement).style.opacity = "1";
      });
    document.body.style.overflowY = "auto";
    document.querySelector("main")?.classList.add("main-active");

    if (!policy.allowIntroFx) {
      // Instant visible state
      gsap.set(
        [
          ".landing-info h3",
          ".landing-intro h2",
          ".landing-intro h1",
          ".landing-h2-info",
          ".landing-info-h2",
          ".landing-h2-1",
          ".landing-h2-2",
          ".landing-h2-info-1",
        ],
        { opacity: 1, y: 0, filter: "none" }
      );
      return;
    }

    const splits: SplitResult[] = [];
    const pick = (sel: string) =>
      Array.from(document.querySelectorAll<HTMLElement>(sel));

    const splitAll = (els: HTMLElement[]) => {
      const chars: HTMLElement[] = [];
      for (const el of els) {
        const s = splitChars(el);
        splits.push(s);
        chars.push(...s.chars);
      }
      return chars;
    };

    const landingChars = splitAll([
      ...pick(".landing-info h3"),
      ...pick(".landing-intro h2"),
      ...pick(".landing-intro h1"),
    ]);

    gsap.fromTo(
      landingChars,
      { opacity: 0, y: 80, filter: "blur(5px)" },
      {
        opacity: 1,
        duration: 1.2,
        filter: "blur(0px)",
        ease: "power3.inOut",
        y: 0,
        stagger: 0.025,
        delay: 0.3,
      }
    );

    const infoChars = splitAll(pick(".landing-h2-info"));
    gsap.fromTo(
      infoChars,
      { opacity: 0, y: 80, filter: "blur(5px)" },
      {
        opacity: 1,
        duration: 1.2,
        filter: "blur(0px)",
        ease: "power3.inOut",
        y: 0,
        stagger: 0.025,
        delay: 0.3,
      }
    );

    gsap.fromTo(
      ".landing-info-h2",
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        duration: 1.2,
        ease: "power1.inOut",
        y: 0,
        delay: 0.8,
      }
    );

    gsap.fromTo(
      [".header", ".icons-section", ".nav-fade"],
      { opacity: 0 },
      {
        opacity: 1,
        duration: 1.2,
        ease: "power1.inOut",
        delay: 0.1,
      }
    );

    const info1 = splitAll(pick(".landing-h2-info-1"));
    const h21 = splitAll(pick(".landing-h2-1"));
    const h22 = splitAll(pick(".landing-h2-2"));

    // Hide secondary lines initially
    gsap.set([...info1, ...h22], { opacity: 0, y: 80 });

    const loops = [
      loopText(infoChars, info1),
      loopText(h21, h22),
    ];

    gsap.to("body", {
      backgroundColor: "#0a0e17",
      duration: 0.5,
      delay: 1,
    });

    return () => {
      loops.forEach((tl) => tl.kill());
      splits.forEach((s) => s.revert());
    };
  }, [enabled, policy.allowIntroFx]);
}

function loopText(charsA: HTMLElement[], charsB: HTMLElement[]) {
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 1 });
  const delay = 4;
  const delay2 = delay * 2 + 1;

  tl.fromTo(
    charsB,
    { opacity: 0, y: 80 },
    {
      opacity: 1,
      duration: 1.2,
      ease: "power3.inOut",
      y: 0,
      stagger: 0.1,
      delay,
    },
    0
  )
    .fromTo(
      charsA,
      { y: 80 },
      {
        duration: 1.2,
        ease: "power3.inOut",
        y: 0,
        stagger: 0.1,
        delay: delay2,
      },
      1
    )
    .fromTo(
      charsA,
      { y: 0 },
      {
        y: -80,
        duration: 1.2,
        ease: "power3.inOut",
        stagger: 0.1,
        delay,
      },
      0
    )
    .to(
      charsB,
      {
        y: -80,
        duration: 1.2,
        ease: "power3.inOut",
        stagger: 0.1,
        delay: delay2,
      },
      1
    );

  return tl;
}

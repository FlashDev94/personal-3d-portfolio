import { useEffect } from "react";
import gsap from "gsap";
import { splitChars, type SplitResult } from "../utils/splitTextDom";
import { useMotionPolicy } from "../utils/motionRuntime";

/**
 * Boot intro FX. Progressive enhancement — if anything fails, content stays visible.
 */
export function useAkashIntro(enabled: boolean) {
  const policy = useMotionPolicy();

  useEffect(() => {
    if (!enabled) return;

    const chrome = document.querySelectorAll(
      ".header, .icons-section, .nav-fade"
    );
    chrome.forEach((el) => {
      (el as HTMLElement).style.opacity = "1";
    });
    document.body.style.overflowY = "auto";

    if (!policy.allowIntroFx) {
      return;
    }

    const splits: SplitResult[] = [];
    const timelines: gsap.core.Timeline[] = [];

    try {
      const pick = (sel: string) =>
        Array.from(document.querySelectorAll<HTMLElement>(sel));

      const splitAll = (els: HTMLElement[]) => {
        const chars: HTMLElement[] = [];
        for (const el of els) {
          if (!el.textContent?.trim()) continue;
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

      if (landingChars.length) {
        gsap.fromTo(
          landingChars,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            duration: 0.9,
            ease: "power3.out",
            y: 0,
            stagger: 0.02,
            delay: 0.15,
          }
        );
      }

      const infoChars = splitAll(pick(".landing-h2-info"));
      const info1 = splitAll(pick(".landing-h2-info-1"));
      const h21 = splitAll(pick(".landing-h2-1"));
      const h22 = splitAll(pick(".landing-h2-2"));

      if (infoChars.length) {
        gsap.fromTo(
          infoChars,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            duration: 0.9,
            ease: "power3.out",
            y: 0,
            stagger: 0.02,
            delay: 0.2,
          }
        );
      }

      gsap.fromTo(
        ".landing-info-h2",
        { opacity: 0, y: 16 },
        { opacity: 1, duration: 0.8, ease: "power2.out", y: 0, delay: 0.35 }
      );

      if (info1.length) gsap.set(info1, { opacity: 0, y: 40 });
      if (h22.length) gsap.set(h22, { opacity: 0, y: 40 });

      if (infoChars.length && info1.length) {
        timelines.push(loopText(infoChars, info1));
      }
      if (h21.length && h22.length) {
        timelines.push(loopText(h21, h22));
      }
    } catch (err) {
      console.warn("[useAkashIntro] FX skipped:", err);
      // Restore any half-split nodes
      splits.forEach((s) => {
        try {
          s.revert();
        } catch {
          /* ignore */
        }
      });
      chrome.forEach((el) => {
        (el as HTMLElement).style.opacity = "1";
      });
    }

    return () => {
      timelines.forEach((tl) => tl.kill());
      splits.forEach((s) => {
        try {
          s.revert();
        } catch {
          /* ignore */
        }
      });
    };
  }, [enabled, policy.allowIntroFx]);
}

function loopText(charsA: HTMLElement[], charsB: HTMLElement[]) {
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.2 });
  const delay = 3.5;

  tl.fromTo(
    charsB,
    { opacity: 0, y: 40 },
    {
      opacity: 1,
      duration: 0.9,
      ease: "power3.inOut",
      y: 0,
      stagger: 0.06,
      delay,
    },
    0
  )
    .to(
      charsA,
      {
        y: -40,
        opacity: 0,
        duration: 0.9,
        ease: "power3.inOut",
        stagger: 0.06,
        delay,
      },
      0
    )
    .to({}, { duration: delay })
    .to(charsB, {
      y: -40,
      opacity: 0,
      duration: 0.9,
      ease: "power3.inOut",
      stagger: 0.06,
    })
    .fromTo(
      charsA,
      { y: 40, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.9,
        ease: "power3.inOut",
        stagger: 0.06,
      },
      "<"
    );

  return tl;
}

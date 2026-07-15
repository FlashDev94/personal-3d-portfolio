/**
 * Central motion / animation policy.
 * All GSAP, cursor, and scrub effects consult this so e2e / a11y / touch stay robust.
 */
import { useMemo, useState, useEffect } from "react";
import { isE2EMode } from "./e2eMode";

export type MotionPolicy = {
  /** Smooth scroll wrapper (ScrollSmoother-like). */
  allowSmoothScroll: boolean;
  /** Custom magnetic cursor. */
  allowCursor: boolean;
  /** ScrollTrigger scrub storytelling. */
  allowScrub: boolean;
  /** Decorative WebGL (mirrors themeRuntime e2e kill). */
  allowWebGL: boolean;
  /** Char stagger / intro FX. */
  allowIntroFx: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  reduceMotion: boolean;
  e2e: boolean;
};

function systemReduceMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function detectTouch(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    (navigator?.maxTouchPoints ?? 0) > 0 ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

function detectDesktop(): boolean {
  if (typeof window === "undefined") return true;
  return window.innerWidth > 1024 && !detectTouch();
}

/** Pure snapshot — safe in effects and non-React code. */
export function getMotionPolicy(overrides?: {
  forceReduce?: boolean;
}): MotionPolicy {
  const e2e = isE2EMode();
  const reduceMotion = e2e || overrides?.forceReduce || systemReduceMotion();
  const isTouch = detectTouch();
  const isDesktop = detectDesktop() && !isTouch;
  const allowFx = !reduceMotion && !e2e;

  return {
    e2e,
    reduceMotion,
    isTouch,
    isDesktop,
    allowSmoothScroll: allowFx && isDesktop,
    allowCursor: allowFx && isDesktop && !isTouch,
    allowScrub: allowFx,
    allowWebGL: !e2e,
    allowIntroFx: allowFx,
  };
}

export function useMotionPolicy(): MotionPolicy {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onResize = () => setTick((t) => t + 1);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => setTick((t) => t + 1);
    window.addEventListener("resize", onResize);
    mq.addEventListener?.("change", onMq);
    return () => {
      window.removeEventListener("resize", onResize);
      mq.removeEventListener?.("change", onMq);
    };
  }, []);

  return useMemo(() => getMotionPolicy(), [tick]);
}

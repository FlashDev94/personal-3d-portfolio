import { useEffect, useMemo, useState } from "react";
import type { TTheme3d } from "../types/portfolio";
import {
  QUALITY_PROFILES,
  resolveThemeTokens,
  type QualityProfile,
} from "../constants/theme3d";

export function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefers(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return prefers;
}

/** Effective motion: true means reduce/disable decorative motion. */
export function resolveReduceMotion(
  theme: TTheme3d,
  systemPrefers: boolean
): boolean {
  if (theme.reducedMotion === "force-on") return true;
  if (theme.reducedMotion === "force-off") return false;
  return systemPrefers;
}

export function useThemeRuntime(theme: TTheme3d) {
  const systemReduced = usePrefersReducedMotion();

  return useMemo(() => {
    const reduceMotion = resolveReduceMotion(theme, systemReduced);
    const quality: QualityProfile = QUALITY_PROFILES[theme.quality];
    const tokens = resolveThemeTokens(theme);
    const base = quality.particleCount;
    const count = Math.round(base * theme.starsDensity);
    const particleCount = Math.max(200, Math.min(4000, count));
    const autoRotate = theme.autoRotate && !reduceMotion && theme.enabled;
    const motionSpeed = reduceMotion ? 0 : theme.motionSpeed;

    return {
      theme,
      reduceMotion,
      quality,
      palette: {
        id: tokens.palette.id,
        label: tokens.palette.label,
        description: tokens.palette.description,
        accent: tokens.accent,
        accentSoft: tokens.accentSoft,
        starsDefault: tokens.starsDefault,
      },
      surface: tokens.surface,
      isLight: tokens.isLight,
      particleCount,
      autoRotate,
      motionSpeed,
      dpr: quality.dpr,
      shadows: quality.shadows && theme.quality !== "low",
      antialias: quality.antialias,
      allowOrbit: theme.allowOrbit && !reduceMotion,
      webglEnabled: theme.enabled,
    };
  }, [theme, systemReduced]);
}

/** Apply palette + surface CSS variables on document root. */
export function applyPaletteToDocument(theme: TTheme3d) {
  if (typeof document === "undefined") return;
  const tokens = resolveThemeTokens(theme);
  const { surface } = tokens;
  const root = document.documentElement;

  root.dataset.palette = tokens.palette.id;
  root.dataset.mode = surface.mode;
  root.style.colorScheme = surface.mode;

  root.style.setProperty("--accent", tokens.accent);
  root.style.setProperty("--accent-soft", tokens.accentSoft);
  root.style.setProperty("--color-primary", surface.primary);
  root.style.setProperty("--color-secondary", surface.secondary);
  root.style.setProperty("--color-tertiary", surface.tertiary);
  root.style.setProperty("--color-black-100", surface.black100);
  root.style.setProperty("--color-black-200", surface.black200);
  root.style.setProperty("--color-white-100", surface.white100);
  root.style.setProperty("--color-fg", surface.fg);
  root.style.setProperty("--color-fg-muted", surface.fgMuted);
  root.style.setProperty("--color-border", surface.border);
  root.style.setProperty("--color-input-bg", surface.inputBg);
  root.style.setProperty("--color-card-shadow", surface.cardShadow);
  root.style.setProperty("--color-hero-wash", surface.heroWash);
  root.style.setProperty("--color-timeline-card", surface.timelineCard);
  root.style.setProperty("--color-timeline-arrow", surface.timelineArrow);
  root.style.setProperty("--color-nav-scrolled", surface.navScrolled);

  // Theme-color meta for mobile browser chrome
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", surface.primary);
}

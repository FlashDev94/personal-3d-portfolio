import type {
  ColorMode,
  ContactSceneId,
  HeroSceneId,
  PaletteId,
  QualityMode,
  TTheme3d,
} from "../types/portfolio";

export const defaultTheme3d: TTheme3d = {
  enabled: true,
  /** Fixed scroll-led workstation stage (Option C hybrid). */
  heroScene: "character_stage",
  contactScene: "planet",
  showStars: true,
  autoRotate: true,
  motionSpeed: 1,
  starsDensity: 1,
  starsColor: "#f272c8",
  quality: "medium",
  palette: "violet",
  colorMode: "dark",
  reducedMotion: "system",
  allowOrbit: true,
  mobile3d: false,
};

export type QualityProfile = {
  dpr: [number, number];
  particleCount: number;
  shadows: boolean;
  antialias: boolean;
};

export const QUALITY_PROFILES: Record<QualityMode, QualityProfile> = {
  low: {
    dpr: [1, 1],
    particleCount: 600,
    shadows: false,
    antialias: false,
  },
  medium: {
    dpr: [1, 1.5],
    particleCount: 1500,
    shadows: true,
    antialias: true,
  },
  high: {
    dpr: [1, 2],
    particleCount: 2500,
    shadows: true,
    antialias: true,
  },
};

/** Surface + text tokens for a color mode. */
export type SurfaceTokens = {
  mode: ColorMode;
  primary: string;
  secondary: string;
  tertiary: string;
  black100: string;
  black200: string;
  white100: string;
  fg: string;
  fgMuted: string;
  cardShadow: string;
  border: string;
  inputBg: string;
  heroWash: string;
  timelineCard: string;
  timelineArrow: string;
  navScrolled: string;
};

export const SURFACE_BY_MODE: Record<ColorMode, SurfaceTokens> = {
  dark: {
    mode: "dark",
    primary: "#050816",
    secondary: "#aaa6c3",
    tertiary: "#151030",
    black100: "#100d25",
    black200: "#090325",
    white100: "#f3f3f3",
    fg: "#ffffff",
    fgMuted: "#dfd9ff",
    cardShadow: "0px 35px 120px -15px #211e35",
    border: "rgba(255, 255, 255, 0.1)",
    inputBg: "rgba(255, 255, 255, 0.05)",
    heroWash: "transparent",
    timelineCard: "#1d1836",
    timelineArrow: "#232631",
    navScrolled: "rgba(5, 8, 22, 0.92)",
  },
  light: {
    mode: "light",
    primary: "#f3f5fb",
    secondary: "#5b6478",
    tertiary: "#ffffff",
    black100: "#e8ecf6",
    black200: "#dde3f0",
    white100: "#1e293b",
    fg: "#0f172a",
    fgMuted: "#334155",
    cardShadow: "0px 18px 48px -16px rgba(15, 23, 42, 0.16)",
    border: "rgba(15, 23, 42, 0.1)",
    inputBg: "rgba(15, 23, 42, 0.04)",
    heroWash:
      "linear-gradient(180deg, rgba(243, 245, 251, 0.55) 0%, rgba(243, 245, 251, 0.92) 70%, #f3f5fb 100%)",
    timelineCard: "#ffffff",
    timelineArrow: "#cbd5e1",
    navScrolled: "rgba(243, 245, 251, 0.92)",
  },
};

export type PaletteTokens = {
  id: PaletteId;
  label: string;
  description: string;
  accent: string;
  accentSoft: string;
  /** Accent tuned for light surfaces (higher contrast). */
  accentLight: string;
  accentSoftLight: string;
  starsDefault: string;
  starsDefaultLight: string;
};

export const PALETTE_OPTIONS: PaletteTokens[] = [
  {
    id: "violet",
    label: "Violet",
    description: "Signature purple — works on dark and light.",
    accent: "#915EFF",
    accentSoft: "rgba(145, 94, 255, 0.35)",
    accentLight: "#6d28d9",
    accentSoftLight: "rgba(109, 40, 217, 0.2)",
    starsDefault: "#f272c8",
    starsDefaultLight: "#7c3aed",
  },
  {
    id: "neon",
    label: "Cyber Cyan",
    description: "Tech cyan / magenta energy.",
    accent: "#22d3ee",
    accentSoft: "rgba(34, 211, 238, 0.35)",
    accentLight: "#0891b2",
    accentSoftLight: "rgba(8, 145, 178, 0.18)",
    starsDefault: "#e879f9",
    starsDefaultLight: "#0e7490",
  },
  {
    id: "minimal",
    label: "Minimal Slate",
    description: "Calm professional grays.",
    accent: "#94a3b8",
    accentSoft: "rgba(148, 163, 184, 0.35)",
    accentLight: "#475569",
    accentSoftLight: "rgba(71, 85, 105, 0.16)",
    starsDefault: "#cbd5e1",
    starsDefaultLight: "#64748b",
  },
  {
    id: "aurora",
    label: "Aurora",
    description: "Teal and green northern-lights vibe.",
    accent: "#2dd4bf",
    accentSoft: "rgba(45, 212, 191, 0.35)",
    accentLight: "#0f766e",
    accentSoftLight: "rgba(15, 118, 110, 0.16)",
    starsDefault: "#86efac",
    starsDefaultLight: "#0d9488",
  },
  {
    id: "warm",
    label: "Warm Studio",
    description: "Amber highlights for a design-studio feel.",
    accent: "#f59e0b",
    accentSoft: "rgba(245, 158, 11, 0.35)",
    accentLight: "#b45309",
    accentSoftLight: "rgba(180, 83, 9, 0.16)",
    starsDefault: "#fdba74",
    starsDefaultLight: "#c2410c",
  },
];

export const COLOR_MODE_OPTIONS: {
  id: ColorMode;
  label: string;
  description: string;
}[] = [
  {
    id: "dark",
    label: "Dark",
    description: "Deep navy night mode — original portfolio look.",
  },
  {
    id: "light",
    label: "Light",
    description: "Bright surfaces, soft cards, high-contrast text.",
  },
];

export const HERO_SCENE_OPTIONS: {
  id: HeroSceneId;
  label: string;
  description: string;
  heavy: boolean;
}[] = [
  {
    id: "desktop_pc",
    label: "Desktop PC",
    description: "Classic interactive workstation model (desktop only).",
    heavy: true,
  },
  {
    id: "abstract_core",
    label: "Abstract Core",
    description: "Floating rings and icosahedron — lightweight procedural.",
    heavy: false,
  },
  {
    id: "character_stage",
    label: "Character stage",
    description: "Fixed scroll-led workstation with mouse look (desktop).",
    heavy: true,
  },
  {
    id: "neon_grid",
    label: "Neon Grid",
    description: "Perspective grid with fog — cyber aesthetic.",
    heavy: false,
  },
  {
    id: "none",
    label: "None (2D only)",
    description: "Hero text and background image only — max performance.",
    heavy: false,
  },
];

export const CONTACT_SCENE_OPTIONS: {
  id: ContactSceneId;
  label: string;
  description: string;
}[] = [
  {
    id: "planet",
    label: "Planet Globe",
    description: "Rotating Earth model next to the contact form.",
  },
  {
    id: "abstract_core",
    label: "Abstract Core",
    description: "Lightweight procedural sculpture.",
  },
  {
    id: "none",
    label: "None",
    description: "Form only — no 3D on the contact side.",
  },
];

export function getPalette(id: PaletteId): PaletteTokens {
  return PALETTE_OPTIONS.find((p) => p.id === id) ?? PALETTE_OPTIONS[0];
}

export function getSurface(mode: ColorMode): SurfaceTokens {
  return SURFACE_BY_MODE[mode] ?? SURFACE_BY_MODE.dark;
}

/** Resolved accent + surfaces for the active palette and color mode. */
export function resolveThemeTokens(theme: Pick<TTheme3d, "palette" | "colorMode">) {
  const palette = getPalette(theme.palette);
  const surface = getSurface(theme.colorMode);
  const isLight = theme.colorMode === "light";
  return {
    palette,
    surface,
    isLight,
    accent: isLight ? palette.accentLight : palette.accent,
    accentSoft: isLight ? palette.accentSoftLight : palette.accentSoft,
    starsDefault: isLight ? palette.starsDefaultLight : palette.starsDefault,
  };
}

export function clampTheme3d(partial: Partial<TTheme3d> | undefined): TTheme3d {
  const base = { ...defaultTheme3d, ...partial };
  return {
    ...base,
    motionSpeed: Math.min(2, Math.max(0.25, Number(base.motionSpeed) || 1)),
    starsDensity: Math.min(2, Math.max(0.25, Number(base.starsDensity) || 1)),
    starsColor: base.starsColor || defaultTheme3d.starsColor,
    enabled: Boolean(base.enabled),
    showStars: Boolean(base.showStars),
    autoRotate: Boolean(base.autoRotate),
    allowOrbit: Boolean(base.allowOrbit),
    mobile3d: Boolean(base.mobile3d),
    colorMode: (["dark", "light"] as ColorMode[]).includes(
      base.colorMode as ColorMode
    )
      ? (base.colorMode as ColorMode)
      : defaultTheme3d.colorMode,
    heroScene: (
      ["desktop_pc", "abstract_core", "neon_grid", "character_stage", "none"] as HeroSceneId[]
    ).includes(base.heroScene as HeroSceneId)
      ? (base.heroScene as HeroSceneId)
      : defaultTheme3d.heroScene,
    contactScene: (
      ["planet", "abstract_core", "none"] as ContactSceneId[]
    ).includes(base.contactScene as ContactSceneId)
      ? (base.contactScene as ContactSceneId)
      : defaultTheme3d.contactScene,
    quality: (["low", "medium", "high"] as QualityMode[]).includes(
      base.quality as QualityMode
    )
      ? (base.quality as QualityMode)
      : defaultTheme3d.quality,
    palette: (
      ["violet", "neon", "minimal", "aurora", "warm"] as PaletteId[]
    ).includes(base.palette as PaletteId)
      ? (base.palette as PaletteId)
      : defaultTheme3d.palette,
    reducedMotion: (["system", "force-off", "force-on"] as const).includes(
      base.reducedMotion as TTheme3d["reducedMotion"]
    )
      ? base.reducedMotion
      : defaultTheme3d.reducedMotion,
  };
}

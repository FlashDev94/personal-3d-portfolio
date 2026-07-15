import type {
  TExperience,
  TNavLink,
  TProject,
  TService,
  TTechnology,
  TTestimonial,
} from "./index";

export type TPortfolioConfig = {
  html: {
    title: string;
    fullName: string;
    email: string;
  };
  hero: {
    name: string;
    p: string[];
  };
  contact: {
    p: string;
    h2: string;
    form: {
      name: { span: string; placeholder: string };
      email: { span: string; placeholder: string };
      message: { span: string; placeholder: string };
    };
  };
  sections: {
    about: { p: string; h2: string; content: string };
    experience: { p: string; h2: string };
    feedbacks: { p: string; h2: string };
    works: { p: string; h2: string; content: string };
  };
};

export type TPortfolioMeta = {
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
};

/** Hero 3D pack ids (no external downloads required). */
export type HeroSceneId =
  | "desktop_pc"
  | "abstract_core"
  | "neon_grid"
  | "character_stage"
  | "none";

/** Contact 3D pack ids. */
export type ContactSceneId = "planet" | "abstract_core" | "none";

export type QualityMode = "low" | "medium" | "high";

export type PaletteId = "violet" | "neon" | "minimal" | "aurora" | "warm";

/** Site surface mode — independent of accent palette. */
export type ColorMode = "dark" | "light";

/** How motion interacts with prefers-reduced-motion. */
export type MotionPref = "system" | "force-off" | "force-on";

/**
 * Admin-configurable 3D + visual theme.
 * Stored in localStorage with the rest of the portfolio config.
 */
export type TTheme3d = {
  /** Master switch — when false, no WebGL canvases mount. */
  enabled: boolean;
  heroScene: HeroSceneId;
  contactScene: ContactSceneId;
  /** Starfield behind contact (and optional ambient particles). */
  showStars: boolean;
  autoRotate: boolean;
  /** Multiplier for auto-rotate / particle spin (0.25–2). */
  motionSpeed: number;
  /** Relative particle count (0.25–2). */
  starsDensity: number;
  starsColor: string;
  quality: QualityMode;
  palette: PaletteId;
  /** Light or dark site surfaces (cards, page bg, text). */
  colorMode: ColorMode;
  reducedMotion: MotionPref;
  /** Allow orbit drag on 3D scenes. */
  allowOrbit: boolean;
  /**
   * When true, light procedural scenes may render on mobile.
   * Heavy GLTF (desktop_pc) still stays desktop-only.
   */
  mobile3d: boolean;
};

export type TPortfolioData = {
  config: TPortfolioConfig;
  navLinks: TNavLink[];
  services: TService[];
  technologies: TTechnology[];
  experiences: TExperience[];
  testimonials: TTestimonial[];
  projects: TProject[];
  meta: TPortfolioMeta;
  theme3d: TTheme3d;
};

export type ConfiguratorTab =
  | "upload"
  | "profiles"
  | "profile"
  | "about"
  | "experience"
  | "skills"
  | "projects"
  | "testimonials"
  | "theme3d"
  | "history"
  | "data";

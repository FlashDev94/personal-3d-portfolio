import type { TPortfolioData } from "../../types/portfolio";
import { clampTheme3d } from "../../constants/theme3d";
import { defaultPortfolioData } from "../../constants/defaults";

/** Structured clone via JSON — portfolio data is JSON-safe (incl. data-URL icons). */
export function clonePortfolio(data: TPortfolioData): TPortfolioData {
  return JSON.parse(JSON.stringify(data)) as TPortfolioData;
}

/**
 * Normalize + merge partial/unknown JSON into a full TPortfolioData.
 * Shared by live storage, import, and version restore.
 */
export function normalizePortfolio(parsed: unknown): TPortfolioData | null {
  if (!parsed || typeof parsed !== "object") return null;
  const raw = parsed as Partial<TPortfolioData>;
  if (!raw.config?.hero?.name && !raw.config?.html?.fullName) return null;

  try {
    return {
      ...defaultPortfolioData,
      ...raw,
      config: {
        ...defaultPortfolioData.config,
        ...raw.config,
        html: { ...defaultPortfolioData.config.html, ...raw.config?.html },
        hero: { ...defaultPortfolioData.config.hero, ...raw.config?.hero },
        contact: {
          ...defaultPortfolioData.config.contact,
          ...raw.config?.contact,
          form: {
            ...defaultPortfolioData.config.contact.form,
            ...raw.config?.contact?.form,
          },
        },
        sections: {
          ...defaultPortfolioData.config.sections,
          ...raw.config?.sections,
          about: {
            ...defaultPortfolioData.config.sections.about,
            ...raw.config?.sections?.about,
          },
          experience: {
            ...defaultPortfolioData.config.sections.experience,
            ...raw.config?.sections?.experience,
          },
          feedbacks: {
            ...defaultPortfolioData.config.sections.feedbacks,
            ...raw.config?.sections?.feedbacks,
          },
          works: {
            ...defaultPortfolioData.config.sections.works,
            ...raw.config?.sections?.works,
          },
        },
      },
      meta: { ...defaultPortfolioData.meta, ...raw.meta },
      navLinks: raw.navLinks?.length
        ? raw.navLinks
        : defaultPortfolioData.navLinks,
      services: raw.services ?? defaultPortfolioData.services,
      technologies: raw.technologies ?? defaultPortfolioData.technologies,
      experiences: raw.experiences ?? defaultPortfolioData.experiences,
      testimonials: raw.testimonials ?? defaultPortfolioData.testimonials,
      projects: raw.projects ?? defaultPortfolioData.projects,
      theme3d: clampTheme3d(raw.theme3d ?? defaultPortfolioData.theme3d),
    };
  } catch {
    return null;
  }
}

export function parsePortfolioJson(raw: string | null): TPortfolioData | null {
  if (!raw) return null;
  try {
    return normalizePortfolio(JSON.parse(raw));
  } catch {
    return null;
  }
}

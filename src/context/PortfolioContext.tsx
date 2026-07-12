import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { TPortfolioData, TTheme3d } from "../types/portfolio";
import { defaultPortfolioData, STORAGE_KEY } from "../constants/defaults";
import { clampTheme3d } from "../constants/theme3d";
import { applyPaletteToDocument } from "../utils/themeRuntime";

/** Portfolio payload without the live theme (theme has its own context). */
export type TPortfolioContent = Omit<TPortfolioData, "theme3d">;

type ContentContextValue = {
  content: TPortfolioContent;
  /** Full snapshot including current theme — identity changes only when content changes. */
  data: TPortfolioData;
  setData: React.Dispatch<React.SetStateAction<TPortfolioData>>;
  updateData: (partial: Partial<TPortfolioData>) => void;
  replaceData: (next: TPortfolioData) => void;
  resetToDefaults: () => void;
  exportJson: () => string;
  importJson: (json: string) => void;
  isHydrated: boolean;
};

type ThemeContextValue = {
  theme3d: TTheme3d;
  updateTheme: (partial: Partial<TTheme3d>) => void;
};

const ContentContext = createContext<ContentContextValue | null>(null);
const ThemeContext = createContext<ThemeContextValue | null>(null);

function splitPortfolio(full: TPortfolioData): {
  content: TPortfolioContent;
  theme3d: TTheme3d;
} {
  const { theme3d, ...content } = full;
  return {
    content,
    theme3d: clampTheme3d(theme3d ?? defaultPortfolioData.theme3d),
  };
}

function safeParse(raw: string | null): TPortfolioData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as TPortfolioData;
    if (!parsed?.config?.hero?.name) return null;
    return {
      ...defaultPortfolioData,
      ...parsed,
      config: {
        ...defaultPortfolioData.config,
        ...parsed.config,
        html: { ...defaultPortfolioData.config.html, ...parsed.config?.html },
        hero: { ...defaultPortfolioData.config.hero, ...parsed.config?.hero },
        contact: {
          ...defaultPortfolioData.config.contact,
          ...parsed.config?.contact,
          form: {
            ...defaultPortfolioData.config.contact.form,
            ...parsed.config?.contact?.form,
          },
        },
        sections: {
          ...defaultPortfolioData.config.sections,
          ...parsed.config?.sections,
          about: {
            ...defaultPortfolioData.config.sections.about,
            ...parsed.config?.sections?.about,
          },
          experience: {
            ...defaultPortfolioData.config.sections.experience,
            ...parsed.config?.sections?.experience,
          },
          feedbacks: {
            ...defaultPortfolioData.config.sections.feedbacks,
            ...parsed.config?.sections?.feedbacks,
          },
          works: {
            ...defaultPortfolioData.config.sections.works,
            ...parsed.config?.sections?.works,
          },
        },
      },
      meta: { ...defaultPortfolioData.meta, ...parsed.meta },
      navLinks: parsed.navLinks?.length
        ? parsed.navLinks
        : defaultPortfolioData.navLinks,
      services: parsed.services ?? defaultPortfolioData.services,
      technologies: parsed.technologies ?? defaultPortfolioData.technologies,
      experiences: parsed.experiences ?? defaultPortfolioData.experiences,
      testimonials: parsed.testimonials ?? defaultPortfolioData.testimonials,
      projects: parsed.projects ?? defaultPortfolioData.projects,
      theme3d: clampTheme3d(parsed.theme3d ?? defaultPortfolioData.theme3d),
    };
  } catch {
    return null;
  }
}

const initial = splitPortfolio(defaultPortfolioData);

export const PortfolioProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [content, setContent] = useState<TPortfolioContent>(initial.content);
  const [theme3d, setTheme3d] = useState<TTheme3d>(initial.theme3d);
  const [isHydrated, setIsHydrated] = useState(false);

  // Always-current refs for export / persistence without widening memo deps
  const contentRef = useRef(content);
  const themeRef = useRef(theme3d);
  contentRef.current = content;
  themeRef.current = theme3d;

  const fullData = useCallback(
    (): TPortfolioData => ({
      ...contentRef.current,
      theme3d: themeRef.current,
    }),
    []
  );

  useEffect(() => {
    const stored = safeParse(localStorage.getItem(STORAGE_KEY));
    if (stored) {
      const split = splitPortfolio(stored);
      setContent(split.content);
      setTheme3d(split.theme3d);
    }
    setIsHydrated(true);
  }, []);

  // Debounced persist — theme thrashing should not rewrite localStorage every click
  useEffect(() => {
    if (!isHydrated) return;
    const handle = window.setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...content, theme3d })
        );
      } catch (err) {
        console.warn("Failed to persist portfolio config", err);
      }
    }, 200);
    return () => window.clearTimeout(handle);
  }, [content, theme3d, isHydrated]);

  useEffect(() => {
    if (content.config.html.title) {
      document.title = content.config.html.title;
    }
  }, [content.config.html.title]);

  useEffect(() => {
    applyPaletteToDocument(theme3d);
  }, [theme3d]);

  const updateTheme = useCallback((partial: Partial<TTheme3d>) => {
    setTheme3d((prev) => clampTheme3d({ ...prev, ...partial }));
  }, []);

  const updateData = useCallback((partial: Partial<TPortfolioData>) => {
    if (partial.theme3d) {
      setTheme3d((prev) =>
        clampTheme3d({ ...prev, ...partial.theme3d })
      );
    }
    const { theme3d: _t, ...rest } = partial;
    if (Object.keys(rest).length === 0) return;
    setContent((prev) => {
      const next = { ...prev, ...rest } as TPortfolioContent;
      // Deep-merge config if provided
      if (partial.config) {
        next.config = {
          ...prev.config,
          ...partial.config,
          html: { ...prev.config.html, ...partial.config.html },
          hero: { ...prev.config.hero, ...partial.config.hero },
          contact: {
            ...prev.config.contact,
            ...partial.config.contact,
            form: {
              ...prev.config.contact.form,
              ...partial.config.contact?.form,
            },
          },
          sections: {
            ...prev.config.sections,
            ...partial.config.sections,
          },
        };
      }
      return next;
    });
  }, []);

  const replaceData = useCallback((next: TPortfolioData) => {
    const split = splitPortfolio(next);
    setContent(split.content);
    setTheme3d(split.theme3d);
  }, []);

  const setData: React.Dispatch<React.SetStateAction<TPortfolioData>> =
    useCallback((action) => {
      const prev = fullData();
      const next = typeof action === "function" ? action(prev) : action;
      replaceData(next);
    }, [fullData, replaceData]);

  const resetToDefaults = useCallback(() => {
    const split = splitPortfolio(defaultPortfolioData);
    setContent(split.content);
    setTheme3d(split.theme3d);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const exportJson = useCallback(
    () => JSON.stringify(fullData(), null, 2),
    [fullData]
  );

  const importJson = useCallback((json: string) => {
    const parsed = safeParse(json);
    if (!parsed) throw new Error("Invalid portfolio JSON");
    replaceData(parsed);
  }, [replaceData]);

  // Content-facing `data` includes latest theme snapshot but only changes identity
  // when *content* changes — keeps theme toggles from re-rendering content consumers.
  const dataForContent = useMemo<TPortfolioData>(
    () => ({ ...content, theme3d: themeRef.current }),
    [content]
  );

  const contentValue = useMemo<ContentContextValue>(
    () => ({
      content,
      data: dataForContent,
      setData,
      updateData,
      replaceData,
      resetToDefaults,
      exportJson,
      importJson,
      isHydrated,
    }),
    [
      content,
      dataForContent,
      setData,
      updateData,
      replaceData,
      resetToDefaults,
      exportJson,
      importJson,
      isHydrated,
    ]
  );

  const themeValue = useMemo<ThemeContextValue>(
    () => ({
      theme3d,
      updateTheme,
    }),
    [theme3d, updateTheme]
  );

  return (
    <ContentContext.Provider value={contentValue}>
      <ThemeContext.Provider value={themeValue}>{children}</ThemeContext.Provider>
    </ContentContext.Provider>
  );
};

/** Content + mutators. Does NOT re-render on pure theme3d changes. */
export function usePortfolio() {
  const ctx = useContext(ContentContext);
  if (!ctx) {
    throw new Error("usePortfolio must be used within PortfolioProvider");
  }
  return ctx;
}

/** Live 3D / palette theme. Re-renders only when theme3d changes. */
export function useTheme3d() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme3d must be used within PortfolioProvider");
  }
  return ctx;
}

/**
 * Subscribe to both content and theme (e.g. navbar, configurator, shell).
 * Prefer usePortfolio / useTheme3d when only one slice is needed.
 */
export function usePortfolioAll() {
  const portfolio = usePortfolio();
  const { theme3d, updateTheme } = useTheme3d();
  const data = useMemo(
    () => ({ ...portfolio.content, theme3d }),
    [portfolio.content, theme3d]
  );
  return { ...portfolio, data, theme3d, updateTheme };
}

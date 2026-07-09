import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { TPortfolioData } from "../types/portfolio";
import { defaultPortfolioData, STORAGE_KEY } from "../constants/defaults";

type PortfolioContextValue = {
  data: TPortfolioData;
  setData: React.Dispatch<React.SetStateAction<TPortfolioData>>;
  updateData: (partial: Partial<TPortfolioData>) => void;
  replaceData: (next: TPortfolioData) => void;
  resetToDefaults: () => void;
  exportJson: () => string;
  importJson: (json: string) => void;
  isHydrated: boolean;
};

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

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
      navLinks: parsed.navLinks?.length ? parsed.navLinks : defaultPortfolioData.navLinks,
      services: parsed.services ?? defaultPortfolioData.services,
      technologies: parsed.technologies ?? defaultPortfolioData.technologies,
      experiences: parsed.experiences ?? defaultPortfolioData.experiences,
      testimonials: parsed.testimonials ?? defaultPortfolioData.testimonials,
      projects: parsed.projects ?? defaultPortfolioData.projects,
    };
  } catch {
    return null;
  }
}

export const PortfolioProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [data, setData] = useState<TPortfolioData>(defaultPortfolioData);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const stored = safeParse(localStorage.getItem(STORAGE_KEY));
    if (stored) setData(stored);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn("Failed to persist portfolio config", err);
    }
  }, [data, isHydrated]);

  useEffect(() => {
    if (data.config.html.title) {
      document.title = data.config.html.title;
    }
  }, [data.config.html.title]);

  const updateData = useCallback((partial: Partial<TPortfolioData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const replaceData = useCallback((next: TPortfolioData) => {
    setData(next);
  }, []);

  const resetToDefaults = useCallback(() => {
    setData(defaultPortfolioData);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const exportJson = useCallback(() => JSON.stringify(data, null, 2), [data]);

  const importJson = useCallback((json: string) => {
    const parsed = safeParse(json);
    if (!parsed) throw new Error("Invalid portfolio JSON");
    setData(parsed);
  }, []);

  const value = useMemo(
    () => ({
      data,
      setData,
      updateData,
      replaceData,
      resetToDefaults,
      exportJson,
      importJson,
      isHydrated,
    }),
    [
      data,
      updateData,
      replaceData,
      resetToDefaults,
      exportJson,
      importJson,
      isHydrated,
    ]
  );

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
};

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) {
    throw new Error("usePortfolio must be used within PortfolioProvider");
  }
  return ctx;
}

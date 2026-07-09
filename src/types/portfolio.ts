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

export type TPortfolioData = {
  config: TPortfolioConfig;
  navLinks: TNavLink[];
  services: TService[];
  technologies: TTechnology[];
  experiences: TExperience[];
  testimonials: TTestimonial[];
  projects: TProject[];
  meta: TPortfolioMeta;
};

export type ConfiguratorTab =
  | "upload"
  | "profile"
  | "about"
  | "experience"
  | "skills"
  | "projects"
  | "testimonials"
  | "data";

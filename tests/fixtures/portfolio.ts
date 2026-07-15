import type { TPortfolioData } from "../../src/types/portfolio";
import { defaultTheme3d } from "../../src/constants/theme3d";

/** Lightweight portfolio fixture free of Vite PNG asset imports. */
export function samplePortfolio(name = "Test User"): TPortfolioData {
  return {
    config: {
      html: {
        title: `${name} — 3D Portfolio`,
        fullName: name,
        email: "t@example.com",
      },
      hero: { name, p: ["line one", "line two"] },
      contact: {
        p: "Get in touch",
        h2: "Contact.",
        form: {
          name: { span: "Name", placeholder: "Name" },
          email: { span: "Email", placeholder: "Email" },
          message: { span: "Message", placeholder: "Message" },
        },
      },
      sections: {
        about: { p: "Intro", h2: "Overview.", content: "About me." },
        experience: { p: "Work", h2: "Experience." },
        feedbacks: { p: "Quotes", h2: "Testimonials." },
        works: { p: "Work", h2: "Projects.", content: "Projects intro." },
      },
    },
    navLinks: [
      { id: "about", title: "About" },
      { id: "work", title: "Work" },
      { id: "contact", title: "Contact" },
    ],
    services: [{ title: "Engineer", icon: "data:image/svg+xml,x" }],
    technologies: [
      { name: "TypeScript", icon: "data:image/png;base64,aaa" },
      { name: "React", icon: "data:image/png;base64,bbb" },
    ],
    experiences: [
      {
        title: "Engineer",
        companyName: "Acme",
        icon: "data:image/svg+xml,c",
        iconBg: "#000",
        date: "2020 – Present",
        points: ["Shipped things."],
      },
    ],
    testimonials: [],
    projects: [
      {
        name: "Demo",
        description: "A demo project",
        tags: [{ name: "react", color: "blue-text-gradient" }],
        image: "data:image/svg+xml,p",
        sourceCodeLink: "https://github.com/",
      },
    ],
    meta: { github: "https://github.com/test" },
    theme3d: { ...defaultTheme3d },
  };
}

export function clonePortfolio<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}

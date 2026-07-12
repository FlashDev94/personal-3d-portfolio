import * as pdfjsLib from "pdfjs-dist";
import type { TPortfolioData } from "../types/portfolio";
import { defaultPortfolioData } from "../constants/defaults";
import {
  inferExperienceSubtitle,
  resolveCompanyIcon,
  resolveProjectImage,
  resolveServiceIcon,
  resolveTechIcon,
  TAG_COLORS,
} from "./icons";
import {
  normalizeText,
  parseResumeCore,
  parseExperience,
  parseProjects,
  parseSkills,
  extractContact,
  splitHeroLines,
  DATE_RANGE,
} from "./resumeParseCore";

// Vite-friendly worker setup for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

function buildServicesFromSkillsAndRoles(
  skills: string[],
  titles: string[]
): { title: string; icon: string }[] {
  const services: string[] = [];
  const joined = `${skills.join(" ")} ${titles.join(" ")}`.toLowerCase();

  if (/react|frontend|typescript|javascript|next/.test(joined)) {
    services.push("Frontend Developer");
  }
  if (/node|backend|api|express|mongo|sql|aws|cloud/.test(joined)) {
    services.push("Backend Developer");
  }
  if (
    /full\s*stack|fullstack/.test(joined) ||
    (services.includes("Frontend Developer") &&
      services.includes("Backend Developer"))
  ) {
    if (!services.includes("Full Stack Developer")) {
      services.unshift("Full Stack Developer");
    }
  }
  if (/mobile|react native|ios|android/.test(joined)) {
    services.push("Mobile Developer");
  }
  if (/ai|openai|ml|llm|generative/.test(joined)) {
    services.push("AI Engineer");
  }
  if (/design|ui|ux|figma|accessibility|wcag/.test(joined)) {
    services.push("UI / Accessibility");
  }

  const unique = Array.from(new Set(services)).slice(0, 4);
  while (unique.length < 2) {
    unique.push(unique.length === 0 ? "Software Engineer" : "Web Developer");
  }

  return unique.map((title, index) => ({
    title,
    icon: resolveServiceIcon(title, index),
  }));
}

export async function extractTextFromPdf(
  file: ArrayBuffer | Uint8Array
): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data: file });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    type Item = { str: string; x: number; y: number };
    const items: Item[] = content.items
      .map((item) => {
        // @ts-expect-error pdfjs text item shape
        const str: string = item.str ?? "";
        // @ts-expect-error transform
        const tr = item.transform as number[] | undefined;
        return {
          str,
          x: tr?.[4] ?? 0,
          y: Math.round((tr?.[5] ?? 0) * 10) / 10,
        };
      })
      .filter((i) => i.str && i.str.trim());

    items.sort((a, b) => b.y - a.y || a.x - b.x);

    const lines: string[] = [];
    let currentY: number | null = null;
    let currentLine: string[] = [];
    const yTolerance = 2.5;

    for (const item of items) {
      if (currentY === null || Math.abs(item.y - currentY) <= yTolerance) {
        currentLine.push(item.str);
        currentY = currentY === null ? item.y : currentY;
      } else {
        lines.push(currentLine.join(" ").replace(/\s+/g, " ").trim());
        currentLine = [item.str];
        currentY = item.y;
      }
    }
    if (currentLine.length) {
      lines.push(currentLine.join(" ").replace(/\s+/g, " ").trim());
    }

    pages.push(lines.filter(Boolean).join("\n"));
  }

  return normalizeText(pages.join("\n"));
}

export function parseResumeText(text: string): TPortfolioData {
  const core = parseResumeCore(text);
  const { contact, summary, skills, heroLines, roleHint } = core;

  const experiences = core.experiences.length
    ? core.experiences
    : [
        {
          title: "Software Engineer",
          companyName: "Your Company",
          date: "Present",
          points: [summary.split(/(?<=[.!?])\s+/)[0] || summary],
        },
      ];

  const projects = core.projects.length
    ? core.projects
    : skills.slice(0, 3).map((skill) => ({
        name: `${skill} Project`,
        description: `Hands-on work involving ${skill} from professional experience.`,
        tags: [skill.toLowerCase().replace(/\s+/g, "")],
        sourceCodeLink: contact.github || "https://github.com/",
      }));

  const firstName = contact.name.split(" ")[0] || contact.name;

  const technologies = (
    skills.length
      ? skills
      : ["TypeScript", "React", "Node.js", "JavaScript", "AWS", "MongoDB"]
  ).map((name) => ({
    name,
    icon: resolveTechIcon(name),
  }));

  const services = buildServicesFromSkillsAndRoles(
    skills,
    experiences.map((e) => e.title)
  );

  const iconBgs = ["#383E56", "#E6DEDD", "#915EFF", "#151030"];

  const portfolio: TPortfolioData = {
    config: {
      ...defaultPortfolioData.config,
      html: {
        title: `${contact.name} — 3D Portfolio`,
        fullName: contact.name,
        email: contact.email || defaultPortfolioData.config.html.email,
      },
      hero: {
        name: firstName,
        p: heroLines,
      },
      sections: {
        ...defaultPortfolioData.config.sections,
        about: {
          p: "Introduction",
          h2: "Overview.",
          content: summary,
        },
        works: {
          p: "My work",
          h2: "Projects.",
          content: `Selected projects and product work that highlight my experience as a ${roleHint.toLowerCase()}. Each item is drawn from real professional impact.`,
        },
      },
    },
    navLinks: defaultPortfolioData.navLinks,
    services,
    technologies,
    experiences: experiences.map((exp, index) => {
      const location =
        "location" in exp && typeof exp.location === "string"
          ? exp.location
          : "";
      const subtitle = inferExperienceSubtitle(
        exp.title,
        exp.points,
        exp.companyName
      );
      return {
        title: exp.title,
        companyName: exp.companyName,
        icon: resolveCompanyIcon(exp.companyName, index),
        iconBg: iconBgs[index % iconBgs.length],
        date: exp.date,
        location: location || undefined,
        subtitle,
        points: exp.points,
      };
    }),
    testimonials: [],
    projects: projects.map((p, index) => ({
      name: p.name,
      description: p.description,
      tags: p.tags.map((t, ti) => ({
        name: t.toLowerCase().replace(/\s+/g, ""),
        color: TAG_COLORS[ti % TAG_COLORS.length],
      })),
      image: resolveProjectImage(p.name, index),
      sourceCodeLink:
        p.sourceCodeLink === "https://github.com/" && contact.github
          ? contact.github
          : p.sourceCodeLink,
    })),
    meta: {
      phone: contact.phone,
      location: contact.location,
      linkedin: contact.linkedin,
      github: contact.github,
    },
    // Keep default 3D theme when filling content from a resume
    theme3d: { ...defaultPortfolioData.theme3d },
  };

  return portfolio;
}

export async function parseResumeFile(file: File): Promise<TPortfolioData> {
  const buffer = await file.arrayBuffer();
  const text = await extractTextFromPdf(new Uint8Array(buffer));
  if (!text || text.length < 40) {
    throw new Error(
      "Could not extract enough text from this PDF. Try another resume or fill details manually."
    );
  }
  return parseResumeText(text);
}

export async function parseResumeFromUrl(url: string): Promise<TPortfolioData> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load resume from ${url}`);
  const buffer = await res.arrayBuffer();
  const text = await extractTextFromPdf(new Uint8Array(buffer));
  if (!text || text.length < 40) {
    throw new Error("Could not extract enough text from the sample resume.");
  }
  return parseResumeText(text);
}

export const __test__ = {
  parseExperience,
  parseProjects,
  parseSkills,
  extractContact,
  splitHeroLines,
  DATE_RANGE,
  parseResumeCore,
};

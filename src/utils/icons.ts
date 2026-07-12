import {
  backend,
  companyCedcoss,
  companyHackerRank,
  companyNagarro,
  companyNetskope,
  creator,
  css,
  docker,
  figma,
  git,
  html,
  javascript,
  mobile,
  mongodb,
  nodejs,
  reactjs,
  redux,
  tailwind,
  threejs,
  typescript,
  web,
} from "../assets";

const ICON_COLORS = ["#383E56", "#E6DEDD", "#915EFF", "#151030", "#232631", "#00cea8"];

export function makeInitialsIcon(label: string, bg?: string): string {
  const words = label
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const initials = (
    words.length >= 2
      ? `${words[0][0]}${words[1][0]}`
      : (words[0] || "?").slice(0, 2)
  ).toUpperCase();
  const color =
    bg ||
    ICON_COLORS[
      Math.abs(
        label.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
      ) % ICON_COLORS.length
    ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="${color}"/>
  <text x="64" y="78" text-anchor="middle" fill="#ffffff" font-size="44" font-family="Arial, Helvetica, sans-serif" font-weight="700">${initials}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function makeProjectPlaceholder(name: string, index = 0): string {
  const palette = [
    ["#915EFF", "#00cea8"],
    ["#2f80ed", "#56ccf2"],
    ["#f12711", "#f5af19"],
    ["#11998e", "#38ef7d"],
    ["#bf61ff", "#00cea8"],
  ];
  const [c1, c2] = palette[index % palette.length];
  const title = name
    .slice(0, 28)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="600" height="400" fill="url(#g)"/>
  <text x="300" y="210" text-anchor="middle" fill="#ffffff" font-size="32" font-family="Arial, Helvetica, sans-serif" font-weight="700">${title}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Built-in tech icons available for the skill picker. */
export const TECH_ICON_OPTIONS: { id: string; label: string; icon: string }[] = [
  { id: "html", label: "HTML", icon: html },
  { id: "css", label: "CSS", icon: css },
  { id: "javascript", label: "JavaScript", icon: javascript },
  { id: "typescript", label: "TypeScript", icon: typescript },
  { id: "react", label: "React", icon: reactjs },
  { id: "redux", label: "Redux", icon: redux },
  { id: "tailwind", label: "Tailwind", icon: tailwind },
  { id: "nodejs", label: "Node.js", icon: nodejs },
  { id: "mongodb", label: "MongoDB", icon: mongodb },
  { id: "threejs", label: "Three.js", icon: threejs },
  { id: "git", label: "Git", icon: git },
  { id: "figma", label: "Figma", icon: figma },
  { id: "docker", label: "Docker", icon: docker },
  { id: "web", label: "Web", icon: web },
  { id: "backend", label: "Backend", icon: backend },
  { id: "mobile", label: "Mobile", icon: mobile },
  { id: "creator", label: "Creator / AI", icon: creator },
];

const TECH_ALIASES: Record<string, string> = {
  html: html,
  html5: html,
  "html 5": html,
  css: css,
  css3: css,
  "css 3": css,
  javascript: javascript,
  js: javascript,
  typescript: typescript,
  ts: typescript,
  react: reactjs,
  "react js": reactjs,
  "react.js": reactjs,
  reactjs: reactjs,
  redux: redux,
  "redux toolkit": redux,
  tailwind: tailwind,
  "tailwind css": tailwind,
  tailwindcss: tailwind,
  node: nodejs,
  "node.js": nodejs,
  nodejs: nodejs,
  "node js": nodejs,
  mongodb: mongodb,
  mongo: mongodb,
  three: threejs,
  "three.js": threejs,
  threejs: threejs,
  git: git,
  github: git,
  figma: figma,
  docker: docker,
  next: reactjs,
  "next.js": reactjs,
  nextjs: reactjs,
  angular: javascript,
  "angular 16": javascript,
  express: nodejs,
  "express.js": nodejs,
  expressjs: nodejs,
  aws: backend,
  "aws (lambda": backend,
  lambda: backend,
  openai: creator,
  "openai api": creator,
  chatgpt: creator,
  "bot framework": backend,
  rabbitmq: backend,
  mysql: mongodb,
  jest: javascript,
  "react testing library": javascript,
  tdd: javascript,
  phalcon: backend,
  "rest apis": backend,
  "rest api": backend,
  "payment gateways": web,
  payments: web,
  "oracle cloud": backend,
  "design systems": figma,
  "design system": figma,
};

export function resolveTechIcon(name: string): string {
  const key = name.toLowerCase().trim();
  if (TECH_ALIASES[key]) return TECH_ALIASES[key];

  // Prefer longer alias matches first to avoid "js" matching inside "css"
  const sorted = Object.entries(TECH_ALIASES).sort(
    (a, b) => b[0].length - a[0].length
  );
  for (const [alias, icon] of sorted) {
    if (alias.length < 2) continue;
    if (key === alias || key.startsWith(`${alias} `) || key.includes(` ${alias}`)) {
      return icon;
    }
    // token boundary match
    const re = new RegExp(
      `(^|[^a-z0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`,
      "i"
    );
    if (re.test(key)) return icon;
  }
  return makeInitialsIcon(name, "#151030");
}

const SERVICE_ICONS = [web, mobile, backend, creator] as const;

export function resolveServiceIcon(title: string, index = 0): string {
  const t = title.toLowerCase();
  if (
    t.includes("mobile") ||
    t.includes("react native") ||
    t.includes("ios") ||
    t.includes("android")
  ) {
    return mobile;
  }
  if (
    t.includes("backend") ||
    t.includes("api") ||
    t.includes("server") ||
    t.includes("cloud") ||
    t.includes("devops")
  ) {
    return backend;
  }
  if (
    t.includes("content") ||
    t.includes("design") ||
    t.includes("ui") ||
    t.includes("ux") ||
    t.includes("creator") ||
    t.includes("ai")
  ) {
    return creator;
  }
  if (t.includes("web") || t.includes("frontend") || t.includes("full")) {
    return web;
  }
  return SERVICE_ICONS[index % SERVICE_ICONS.length];
}

/** Normalize company names for icon lookup (strip legal suffixes, punctuation). */
export function normalizeCompanyKey(name: string): string {
  return name
    .toLowerCase()
    .replace(
      /\b(pvt\.?|private|ltd\.?|limited|inc\.?|llc|corp\.?|corporation|technologies|technology|softwares?|solutions|group|co\.?)\b/gi,
      " "
    )
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Known employer brand marks shipped with the app (no runtime CDN). */
const COMPANY_ICON_ALIASES: { match: RegExp; icon: string }[] = [
  { match: /\bnetskope\b/i, icon: companyNetskope },
  { match: /\bhackerrank\b/i, icon: companyHackerRank },
  { match: /\bnagarro\b/i, icon: companyNagarro },
  { match: /\bcedcoss\b/i, icon: companyCedcoss },
];

export function resolveCompanyIcon(companyName: string, index = 0): string {
  const raw = (companyName || "").trim();
  if (!raw) {
    return makeInitialsIcon("Co", ICON_COLORS[index % ICON_COLORS.length]);
  }
  for (const { match, icon } of COMPANY_ICON_ALIASES) {
    if (match.test(raw)) return icon;
  }
  const key = normalizeCompanyKey(raw);
  for (const { match, icon } of COMPANY_ICON_ALIASES) {
    if (match.test(key)) return icon;
  }
  return makeInitialsIcon(raw, ICON_COLORS[index % ICON_COLORS.length]);
}

/** Strip legal suffixes for cleaner timeline labels. */
export function cleanCompanyDisplayName(name: string): string {
  return name
    .replace(
      /\s*(Pvt\.?\s*Ltd\.?|Private\s+Limited|Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation)\.?\s*$/i,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Infer a short domain-focused subtitle from role title + bullets.
 * Used when the resume does not provide a dedicated focus line.
 */
export function inferExperienceSubtitle(
  title: string,
  points: string[],
  companyName = ""
): string {
  const blob = `${title} ${companyName} ${points.join(" ")}`.toLowerCase();

  if (/security|drm|policy|incident|sase|zero.?trust|netskope/.test(blob)) {
    return "Enterprise security · backend services";
  }
  if (
    /design system|wcag|accessibility|proctor|hiring|interview|hackerrank/.test(
      blob
    )
  ) {
    return "Product UI · design systems · generative AI";
  }
  if (/migrat|angular|i18n|international|casino|nagarro/.test(blob)) {
    return "Frontend modernization · client delivery";
  }
  if (
    /e-?commerce|marketplace|payment|shopify|seller|amazon|ebay|cedcoss/.test(
      blob
    )
  ) {
    return "Full-stack commerce · marketplace integrations";
  }
  if (/microservice|distributed|service mesh|kafka|rabbitmq|queue/.test(blob)) {
    return "Distributed systems · async messaging";
  }
  if (/cloud|aws|lambda|devops|kubernetes|docker/.test(blob)) {
    return "Cloud platforms · infrastructure";
  }
  if (/mobile|react native|ios|android/.test(blob)) {
    return "Mobile product engineering";
  }
  if (/frontend|front-end|react|ui|ux/.test(blob)) {
    return "Frontend engineering · web platforms";
  }
  if (/backend|api|node|server|rest/.test(blob)) {
    return "Backend APIs · service design";
  }
  if (/full.?stack/.test(blob)) {
    return "Full-stack product engineering";
  }
  if (/staff|principal|architect/.test(blob)) {
    return "Architecture · technical leadership";
  }
  if (/senior|lead/.test(blob)) {
    return "Feature ownership · mentoring";
  }
  return "Software engineering · product delivery";
}

export function resolveProjectImage(name: string, index = 0): string {
  return makeProjectPlaceholder(name, index);
}

export const TAG_COLORS = [
  "blue-text-gradient",
  "green-text-gradient",
  "pink-text-gradient",
  "orange-text-gradient",
];

/** Read a local image file as a data URL for custom skill/project icons. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read image file"));
    };
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

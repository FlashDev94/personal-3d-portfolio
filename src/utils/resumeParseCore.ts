/**
 * Pure resume text parsing (no asset imports) — safe for Node smoke tests.
 */

export const SECTION_HEADERS = [
  "summary",
  "professional summary",
  "profile",
  "about",
  "objective",
  "experience",
  "work experience",
  "professional experience",
  "employment",
  "employment history",
  "projects",
  "personal projects",
  "key projects",
  "technical skills",
  "skills",
  "technologies",
  "tech stack",
  "education",
  "certifications",
  "certifications & awards",
  "awards",
  "achievements",
] as const;

export const DATE_RANGE =
  /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}\s*[–—\-to]+\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|present|current|now)/i;

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE =
  /(?:\+\d{1,3}[-.\s]?)?(?:\(?\d{2,5}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{4,6}/;
const LINKEDIN_RE =
  /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+\/?/i;
const GITHUB_RE =
  /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+\/?/i;

const ROLE_RE =
  /engineer|developer|manager|lead|architect|intern|consultant|designer|analyst|staff|senior|principal|sde|swe/i;

export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isSectionHeader(line: string): string | null {
  const cleaned = line.trim().toLowerCase().replace(/[:：]$/, "");
  if (SECTION_HEADERS.includes(cleaned as (typeof SECTION_HEADERS)[number])) {
    return cleaned;
  }
  if (cleaned.length <= 40 && /^[a-z0-9\s&/]+$/.test(cleaned)) {
    const match = SECTION_HEADERS.find((h) => h === cleaned);
    if (match) return match;
  }
  return null;
}

function normalizeSectionKey(header: string): string {
  if (
    header.includes("summary") ||
    header === "profile" ||
    header === "about" ||
    header === "objective"
  ) {
    return "summary";
  }
  if (header.includes("experience") || header.includes("employment")) {
    return "experience";
  }
  if (header.includes("project")) return "projects";
  if (header.includes("skill") || header.includes("tech")) return "skills";
  if (header.includes("education")) return "education";
  if (
    header.includes("certif") ||
    header.includes("award") ||
    header.includes("achieve")
  ) {
    return "certifications";
  }
  return header;
}

export function splitSections(text: string): Record<string, string> {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const sections: Record<string, string[]> = { header: [] };
  let current = "header";

  for (const line of lines) {
    const header = isSectionHeader(line);
    if (header) {
      current = normalizeSectionKey(header);
      if (!sections[current]) sections[current] = [];
      continue;
    }
    if (!sections[current]) sections[current] = [];
    sections[current].push(line);
  }

  return Object.fromEntries(
    Object.entries(sections).map(([k, v]) => [k, v.join("\n")])
  );
}

export function extractContact(headerText: string, fullText: string) {
  const blob = `${headerText}\n${fullText}`;
  const email = blob.match(EMAIL_RE)?.[0] || "";
  let linkedin = blob.match(LINKEDIN_RE)?.[0] || "";
  let github = blob.match(GITHUB_RE)?.[0] || "";

  if (linkedin && !linkedin.startsWith("http")) {
    linkedin = `https://${linkedin.replace(/^\/+/, "")}`;
  }
  if (github && !github.startsWith("http")) {
    github = `https://${github.replace(/^\/+/, "")}`;
  }

  let phone = "";
  const phoneCandidates = blob.match(
    /(?:\+\d{1,3}[-.\s]?)?\d{2,5}[-.\s]?\d{3,5}[-.\s]?\d{4,6}/g
  );
  if (phoneCandidates) {
    phone =
      phoneCandidates.find(
        (p) => p.includes("+") || p.replace(/\D/g, "").length >= 10
      ) || phoneCandidates[0];
    phone = phone.trim();
  }

  const headerLines = headerText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  let name = headerLines[0] || "Your Name";
  if (EMAIL_RE.test(name) || PHONE_RE.test(name) || name.length > 60) {
    name = "Your Name";
  }

  let location = "";
  const contactLine = headerLines.find(
    (l) =>
      l.includes("|") ||
      EMAIL_RE.test(l) ||
      /linkedin|github/i.test(l) ||
      PHONE_RE.test(l)
  );
  if (contactLine) {
    const parts = contactLine.split("|").map((p) => p.trim());
    const loc = parts.find(
      (p) =>
        p &&
        !EMAIL_RE.test(p) &&
        !PHONE_RE.test(p) &&
        !/linkedin|github/i.test(p) &&
        /[A-Za-z]/.test(p)
    );
    if (loc) location = loc;
  }

  return { name, email, phone, location, linkedin, github };
}

export function splitHeroLines(
  summary: string,
  fallbackRole = "Full Stack Developer"
): string[] {
  const role = fallbackRole.replace(/\s+/g, " ").trim() || "Full Stack Developer";
  const clean = summary.replace(/\s+/g, " ").trim();

  if (!clean) {
    return ["I develop production-ready", `${role.toLowerCase()} solutions`];
  }

  if (/full\s*stack/i.test(clean) || /full\s*stack/i.test(role)) {
    return ["I build production-ready", "full stack web applications"];
  }
  if (/frontend|front-end|react/i.test(role)) {
    return ["I craft polished", "frontend experiences"];
  }
  if (/backend|api|server/i.test(role)) {
    return ["I design reliable", "backend systems & APIs"];
  }

  const sentence = clean.split(/(?<=[.!?])\s+/)[0];
  const words = sentence.split(" ").filter(Boolean);
  if (words.length <= 8) {
    const mid = Math.ceil(words.length / 2);
    return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
  }
  return [words.slice(0, 5).join(" "), words.slice(5, 11).join(" ")];
}

function stripDateFromLine(line: string): { text: string; date: string } {
  const match = line.match(DATE_RANGE);
  if (!match) return { text: line.trim(), date: "" };
  const date = match[0].replace(/[–—]/g, "–").trim();
  const text = line.replace(DATE_RANGE, "").replace(/\s+/g, " ").trim();
  return { text, date };
}

function isLocationLine(s: string): boolean {
  const t = s.trim();
  if (ROLE_RE.test(t) || t.length > 48 || !t.includes(",")) return false;
  const [city, ...rest] = t.split(",").map((p) => p.trim());
  const country = rest.join(", ").trim();
  if (!city || !country) return false;
  if (ROLE_RE.test(city) || ROLE_RE.test(country)) return false;
  // city: 1–3 words; country: 1–3 words
  const cityWords = city.split(/\s+/);
  const countryWords = country.split(/\s+/);
  if (cityWords.length > 3 || countryWords.length > 3) return false;
  return (
    cityWords.every((w) => /^[A-Za-z][A-Za-z.'-]*$/.test(w)) &&
    countryWords.every((w) => /^[A-Za-z][A-Za-z.'-]*$/.test(w))
  );
}

function splitTitleAndLocation(line: string): {
  title: string;
  location: string;
} {
  const trimmed = line.trim();
  const comma = trimmed.lastIndexOf(",");
  if (comma === -1) return { title: trimmed, location: "" };

  const country = trimmed.slice(comma + 1).trim();
  const before = trimmed.slice(0, comma).trim();
  if (!country || !/^[A-Za-z]/.test(country) || ROLE_RE.test(country)) {
    return { title: trimmed, location: "" };
  }

  const words = before.split(/\s+/).filter(Boolean);
  if (words.length < 2) return { title: trimmed, location: "" };

  // City is the last 1–2 tokens before the comma (e.g. "New Delhi", "Bengaluru")
  const multiCityPrefix = /^(new|san|los|sao|tel|kuala|abu|hong|rio|st\.?|saint)$/i;
  let cityWordCount = 1;
  if (
    words.length >= 3 &&
    multiCityPrefix.test(words[words.length - 2] || "")
  ) {
    cityWordCount = 2;
  }

  const city = words.slice(-cityWordCount).join(" ");
  const title = words.slice(0, -cityWordCount).join(" ");
  const location = `${city}, ${country}`;

  if (!title || !isLocationLine(location) || ROLE_RE.test(city)) {
    return { title: trimmed, location: "" };
  }

  return { title, location };
}

function isBullet(s: string): boolean {
  return /^[•\-\u2013\u2014*]/.test(s);
}

function cleanCompanyName(name: string): string {
  return name
    .replace(
      /\s*(Pvt\.?\s*Ltd\.?|Private\s+Limited|Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation)\.?\s*$/i,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function parseExperience(section: string) {
  if (!section.trim()) return [];
  const lines = section
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const experiences: {
    title: string;
    companyName: string;
    date: string;
    location: string;
    points: string[];
  }[] = [];

  let i = 0;
  while (i < lines.length) {
    if (isBullet(lines[i])) {
      i++;
      continue;
    }

    let dateIdx = -1;
    for (let j = i; j < Math.min(i + 5, lines.length); j++) {
      if (DATE_RANGE.test(lines[j])) {
        dateIdx = j;
        break;
      }
    }

    if (dateIdx === -1) break;

    const { text: companyFromDateLine, date } = stripDateFromLine(lines[dateIdx]);
    let companyName = companyFromDateLine || "Company";
    let title = "Role";
    let location = "";

    const before = lines.slice(Math.max(i, dateIdx - 2), dateIdx);
    if (!companyFromDateLine && before[0]) {
      companyName = before[0];
    }

    let k = dateIdx + 1;
    while (
      k < lines.length &&
      !isBullet(lines[k]) &&
      !DATE_RANGE.test(lines[k])
    ) {
      const line = lines[k];
      if (DATE_RANGE.test(line)) break;

      if (
        line.length < 60 &&
        k + 1 < lines.length &&
        DATE_RANGE.test(lines[k + 1]) &&
        !ROLE_RE.test(line)
      ) {
        break;
      }

      if (isLocationLine(line)) {
        location = line.trim();
        k++;
        continue;
      }

      if (ROLE_RE.test(line) || title === "Role") {
        const split = splitTitleAndLocation(line);
        if (split.title) title = split.title;
        if (split.location) location = split.location;
        k++;
        if (ROLE_RE.test(split.title)) break;
        continue;
      }
      k++;
    }

    if (title === "Role") {
      const near = [
        ...before,
        companyFromDateLine,
        ...lines.slice(dateIdx + 1, dateIdx + 3),
      ];
      const roleLine = near.find(
        (l) => l && ROLE_RE.test(l) && !DATE_RANGE.test(l)
      );
      if (roleLine) {
        const split = splitTitleAndLocation(roleLine);
        title = split.title;
        if (split.location && !location) location = split.location;
      }
    }

    if (ROLE_RE.test(companyName) && !ROLE_RE.test(title)) {
      const swap = companyName;
      companyName = title;
      title = swap;
    }

    const points: string[] = [];
    while (k < lines.length) {
      const line = lines[k];

      if (DATE_RANGE.test(line)) break;

      if (
        !isBullet(line) &&
        line.length < 70 &&
        k + 1 < lines.length &&
        DATE_RANGE.test(lines[k + 1])
      ) {
        break;
      }

      if (!isBullet(line) && DATE_RANGE.test(line)) break;

      if (isBullet(line)) {
        points.push(line.replace(/^[•\-\u2013\u2014*]\s*/, "").trim());
      } else if (
        points.length > 0 &&
        line.length > 20 &&
        !isLocationLine(line) &&
        !ROLE_RE.test(line)
      ) {
        points[points.length - 1] += " " + line;
      } else if (ROLE_RE.test(line) && title === "Role") {
        const split = splitTitleAndLocation(line);
        title = split.title;
        if (split.location && !location) location = split.location;
      } else if (
        !isLocationLine(line) &&
        !ROLE_RE.test(line) &&
        line.length > 40 &&
        !DATE_RANGE.test(line)
      ) {
        points.push(line);
      }
      k++;
    }

    experiences.push({
      title: title.replace(/^[•\-\u2013\u2014*]\s*/, "").trim() || "Role",
      companyName:
        cleanCompanyName(
          companyName.replace(/^[•\-\u2013\u2014*]\s*/, "").trim()
        ) || "Company",
      date: date || "Present",
      location,
      points: points.length
        ? points
        : ["Contributed to product delivery and engineering excellence."],
    });

    i = k;
  }

  return experiences;
}

export function parseProjects(section: string) {
  if (!section.trim()) return [];
  const lines = section
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const projects: {
    name: string;
    description: string;
    tags: string[];
    sourceCodeLink: string;
  }[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isBullet(line)) {
      // Orphan bullets attach to previous project when present
      if (projects.length) {
        projects[projects.length - 1].description +=
          " " + line.replace(/^[•\-\u2013\u2014*]\s*/, "");
      }
      i++;
      continue;
    }

    // Short wrap fragments (e.g. "processing.") are description continuations
    if (
      projects.length &&
      line.length < 40 &&
      !line.includes("|") &&
      !DATE_RANGE.test(line) &&
      !/^[A-Z][A-Za-z0-9 &/+'.-]{2,}$/.test(line)
    ) {
      projects[projects.length - 1].description += " " + line;
      i++;
      continue;
    }

    const { text: titlePart, date } = stripDateFromLine(line);
    if (!titlePart && !date) {
      i++;
      continue;
    }

    // Require a project-like header: pipe tech list, or Title Case with optional date
    const looksLikeProject =
      titlePart.includes("|") ||
      (titlePart.length >= 8 &&
        /[A-Za-z]/.test(titlePart) &&
        (date ||
          (i + 1 < lines.length &&
            (isBullet(lines[i + 1]) || DATE_RANGE.test(lines[i + 1])))));

    if (!looksLikeProject) {
      if (projects.length && titlePart.length > 10) {
        projects[projects.length - 1].description += " " + titlePart;
      }
      i++;
      continue;
    }

    const [nameRaw, techRaw] = titlePart.split("|").map((s) => s.trim());
    const name = nameRaw || `Project ${projects.length + 1}`;
    // Drop trailing punctuation-only names
    if (name.length < 3 || /^[a-z.]+$/.test(name)) {
      if (projects.length) {
        projects[projects.length - 1].description += " " + name;
      }
      i++;
      continue;
    }

    const tags = (techRaw || "")
      .split(/,|\/|&/)
      .map((t) => t.trim())
      .filter((t) => t.length > 1 && t.length < 40)
      .slice(0, 5);

    i++;
    if (
      i < lines.length &&
      DATE_RANGE.test(lines[i]) &&
      !lines[i].includes("|")
    ) {
      i++;
    }

    const descParts: string[] = [];
    while (i < lines.length) {
      const l = lines[i];
      if (!isBullet(l)) {
        if (l.includes("|") && descParts.length > 0) break;
        if (DATE_RANGE.test(l) && l.includes("|")) break;
        if (
          DATE_RANGE.test(l) &&
          !isBullet(l) &&
          descParts.length > 0 &&
          stripDateFromLine(l).text.length > 3
        ) {
          break;
        }
      }

      if (isBullet(l)) {
        descParts.push(l.replace(/^[•\-\u2013\u2014*]\s*/, ""));
      } else if (DATE_RANGE.test(l) && !l.includes("|")) {
        // skip pure date
      } else if (l.length > 8 && !l.includes("|")) {
        // continuation wrap of previous bullet / description
        if (descParts.length) {
          descParts[descParts.length - 1] += " " + l;
        } else {
          descParts.push(l);
        }
      } else if (l.includes("|")) {
        break;
      } else {
        break;
      }
      i++;
    }

    projects.push({
      name,
      description:
        descParts.join(" ") ||
        (date ? `Project timeline: ${date}.` : "Project details from resume."),
      tags: tags.length ? tags : ["web"],
      sourceCodeLink: "https://github.com/",
    });
  }

  return projects;
}

export function parseSkills(section: string): string[] {
  if (!section.trim()) return [];
  const skills = new Set<string>();

  const cleaned = section
    .replace(/^[A-Za-z0-9 &/+-]+:\s*/gm, "")
    .replace(/\(([^)]+)\)/g, ", $1")
    .replace(/\n/g, ",");

  cleaned
    .split(/,|\/|;|\|/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 40)
    .forEach((s) => {
      const skill = s
        .replace(/\.$/, "")
        .replace(/^[•\-\u2013\u2014*]\s*/, "")
        .trim();
      if (
        skill &&
        !/^(and|or|with|using)$/i.test(skill) &&
        !/^\d+$/.test(skill)
      ) {
        skills.add(skill);
      }
    });

  const preferred = [
    "TypeScript",
    "JavaScript",
    "React",
    "Redux",
    "Next.js",
    "Node.js",
    "Express.js",
    "MongoDB",
    "AWS",
    "Docker",
    "GitHub",
    "Jest",
    "HTML5",
    "CSS",
    "Angular",
    "OpenAI API",
  ];
  const list = Array.from(skills);
  const ordered = [
    ...preferred.filter((p) =>
      list.some((s) => s.toLowerCase() === p.toLowerCase())
    ),
    ...list.filter(
      (s) => !preferred.some((p) => p.toLowerCase() === s.toLowerCase())
    ),
  ];

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const s of ordered) {
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(s);
  }
  return unique.slice(0, 16);
}

export type ParsedResumeCore = {
  contact: ReturnType<typeof extractContact>;
  summary: string;
  experiences: ReturnType<typeof parseExperience>;
  projects: ReturnType<typeof parseProjects>;
  skills: string[];
  heroLines: string[];
  roleHint: string;
};

export function parseResumeCore(text: string): ParsedResumeCore {
  const normalized = normalizeText(text);
  const sections = splitSections(normalized);
  const contact = extractContact(sections.header || "", normalized);
  const summary =
    sections.summary ||
    "Passionate software engineer building scalable, user-focused products.";
  const experiences = parseExperience(sections.experience || "");
  const projects = parseProjects(sections.projects || "");
  const skills = parseSkills(sections.skills || "");
  const roleHint =
    experiences[0]?.title ||
    (skills.some((s) => /react|node|full/i.test(s))
      ? "Full Stack Developer"
      : "Software Engineer");
  const heroLines = splitHeroLines(summary, roleHint);

  return {
    contact,
    summary: summary.replace(/\s+/g, " ").trim(),
    experiences,
    projects,
    skills,
    heroLines,
    roleHint,
  };
}

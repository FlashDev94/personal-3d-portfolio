import type {
  TExperience,
  TNavLink,
  TProject,
  TService,
  TTechnology,
  TTestimonial,
} from "../../types/index";
import type { TPortfolioData, TTheme3d } from "../../types/portfolio";
import { clampTheme3d } from "../../constants/theme3d";

/** UI grouping for selective restore checkboxes. */
export type DiffGroup =
  | "profile"
  | "about"
  | "contact"
  | "nav"
  | "meta"
  | "services"
  | "skills"
  | "experience"
  | "projects"
  | "testimonials"
  | "theme3d";

export type DiffKind = "text" | "icon" | "scalar" | "list" | "theme";

/**
 * A single restoreable delta between two portfolio snapshots.
 * Applying means taking the `to` side value for this path onto a base snapshot.
 */
export type PortfolioDiffEntry = {
  id: string;
  group: DiffGroup;
  label: string;
  /** Short human summary (from → to). */
  summary: string;
  kind: DiffKind;
  /** Dot path used by applySelectedDiffs (e.g. theme3d.palette, technologies[2].icon). */
  path: string;
  /** Value from the "to" (compare) snapshot. */
  toValue: unknown;
  /** Value from the "from" (base) snapshot — for preview only. */
  fromValue: unknown;
};

export type DiffPortfoliosOptions = {
  /** When true, emit one entry per theme3d field; otherwise a single theme block if any differ. */
  expandTheme?: boolean;
};

function stableStringify(value: unknown): string {
  return JSON.stringify(value);
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return a === b;
  return stableStringify(a) === stableStringify(b);
}

/** Truncate long / data-URL values for UI. */
export function previewValue(value: unknown, kind: DiffKind = "text"): string {
  if (value === undefined) return "(missing)";
  if (value === null) return "null";
  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    if (kind === "icon" || value.startsWith("data:image/")) {
      const kb = Math.max(1, Math.round(value.length / 1024));
      const mime = value.startsWith("data:")
        ? value.slice(5, value.indexOf(";") > 0 ? value.indexOf(";") : 20)
        : "image";
      return `uploaded ${mime} (~${kb} KB)`;
    }
    if (value.length > 80) return `${value.slice(0, 77)}…`;
    return value || "(empty)";
  }
  if (Array.isArray(value)) {
    return `[${value.length} item${value.length === 1 ? "" : "s"}]`;
  }
  try {
    const s = JSON.stringify(value);
    return s.length > 80 ? `${s.slice(0, 77)}…` : s;
  } catch {
    return String(value);
  }
}

function pushScalar(
  out: PortfolioDiffEntry[],
  opts: {
    id: string;
    group: DiffGroup;
    label: string;
    path: string;
    fromValue: unknown;
    toValue: unknown;
    kind?: DiffKind;
  }
): void {
  if (valuesEqual(opts.fromValue, opts.toValue)) return;
  const kind = opts.kind ?? "text";
  out.push({
    id: opts.id,
    group: opts.group,
    label: opts.label,
    summary: `${previewValue(opts.fromValue, kind)} → ${previewValue(opts.toValue, kind)}`,
    kind,
    path: opts.path,
    fromValue: opts.fromValue,
    toValue: opts.toValue,
  });
}

function techKey(t: TTechnology, index: number): string {
  return t.name?.trim() || `__idx_${index}`;
}

function serviceKey(s: TService, index: number): string {
  return s.title?.trim() || `__idx_${index}`;
}

function expKey(e: TExperience, index: number): string {
  const k = [e.companyName, e.title, e.date].map((x) => x?.trim() || "").join("|");
  return k === "||" ? `__idx_${index}` : k;
}

function projectKey(p: TProject, index: number): string {
  return p.name?.trim() || `__idx_${index}`;
}

function testimonialKey(t: TTestimonial, index: number): string {
  const k = [t.name, t.company].map((x) => x?.trim() || "").join("|");
  return k === "|" ? `__idx_${index}` : k;
}

function navKey(n: TNavLink, index: number): string {
  return n.id?.trim() || `__idx_${index}`;
}

type KeyedItem<T> = { key: string; index: number; item: T };

function indexByKey<T>(
  items: T[],
  keyFn: (item: T, index: number) => string
): Map<string, KeyedItem<T>> {
  const map = new Map<string, KeyedItem<T>>();
  items.forEach((item, index) => {
    let key = keyFn(item, index);
    // Disambiguate duplicate keys so we never silently drop items
    if (map.has(key)) {
      key = `${key}#${index}`;
    }
    map.set(key, { key, index, item });
  });
  return map;
}

function diffKeyedList<T extends object>(
  out: PortfolioDiffEntry[],
  opts: {
    group: DiffGroup;
    listLabel: string;
    arrayPath: string;
    fromList: T[];
    toList: T[];
    keyFn: (item: T, index: number) => string;
    itemLabel: (item: T) => string;
    /** Field extractors for per-field diffs when both sides have the item. */
    fields: Array<{
      field: string;
      label: string;
      kind?: DiffKind;
      get: (item: T) => unknown;
    }>;
  }
): void {
  const fromMap = indexByKey(opts.fromList, opts.keyFn);
  const toMap = indexByKey(opts.toList, opts.keyFn);
  const allKeys = new Set([...fromMap.keys(), ...toMap.keys()]);

  for (const key of allKeys) {
    const from = fromMap.get(key);
    const to = toMap.get(key);
    const labelBase = opts.itemLabel((to?.item ?? from?.item)!);

    if (from && !to) {
      out.push({
        id: `${opts.arrayPath}:remove:${key}`,
        group: opts.group,
        label: `Remove ${opts.listLabel}: ${labelBase}`,
        summary: `${labelBase} present in base only`,
        kind: "list",
        path: `${opts.arrayPath}[key=${key}]`,
        fromValue: from.item,
        toValue: null,
      });
      continue;
    }

    if (!from && to) {
      out.push({
        id: `${opts.arrayPath}:add:${key}`,
        group: opts.group,
        label: `Add ${opts.listLabel}: ${labelBase}`,
        summary: `${labelBase} present in compare only`,
        kind: "list",
        path: `${opts.arrayPath}[key=${key}]`,
        fromValue: null,
        toValue: to.item,
      });
      continue;
    }

    if (!from || !to) continue;

    // Whole-item replace if structure differs beyond tracked fields, else field-level
    let fieldDiffs = 0;
    for (const f of opts.fields) {
      const fv = f.get(from.item);
      const tv = f.get(to.item);
      if (valuesEqual(fv, tv)) continue;
      fieldDiffs++;
      const kind = f.kind ?? "text";
      out.push({
        id: `${opts.arrayPath}:${key}:${f.field}`,
        group: opts.group,
        label: `${labelBase} · ${f.label}`,
        summary: `${previewValue(fv, kind)} → ${previewValue(tv, kind)}`,
        kind,
        path: `${opts.arrayPath}[key=${key}].${f.field}`,
        fromValue: fv,
        toValue: tv,
      });
    }

    // Safety: if items differ but no field extractor caught it, replace whole item
    if (fieldDiffs === 0 && !valuesEqual(from.item, to.item)) {
      out.push({
        id: `${opts.arrayPath}:replace:${key}`,
        group: opts.group,
        label: `Replace ${opts.listLabel}: ${labelBase}`,
        summary: "Item content differs",
        kind: "list",
        path: `${opts.arrayPath}[key=${key}]`,
        fromValue: from.item,
        toValue: to.item,
      });
    }
  }
}

const THEME_FIELDS: Array<{
  key: keyof TTheme3d;
  label: string;
  kind?: DiffKind;
}> = [
  { key: "enabled", label: "3D enabled", kind: "scalar" },
  { key: "heroScene", label: "Hero scene", kind: "theme" },
  { key: "contactScene", label: "Contact scene", kind: "theme" },
  { key: "showStars", label: "Show stars", kind: "scalar" },
  { key: "autoRotate", label: "Auto-rotate", kind: "scalar" },
  { key: "motionSpeed", label: "Motion speed", kind: "scalar" },
  { key: "starsDensity", label: "Stars density", kind: "scalar" },
  { key: "starsColor", label: "Stars color", kind: "theme" },
  { key: "quality", label: "Quality", kind: "theme" },
  { key: "palette", label: "Palette", kind: "theme" },
  { key: "colorMode", label: "Color mode", kind: "theme" },
  { key: "reducedMotion", label: "Reduced motion", kind: "theme" },
  { key: "allowOrbit", label: "Allow orbit", kind: "scalar" },
  { key: "mobile3d", label: "Mobile 3D", kind: "scalar" },
];

/**
 * Compare two portfolio snapshots and return restoreable change units.
 * Direction: differences that move `from` toward `to`.
 */
export function diffPortfolios(
  from: TPortfolioData,
  to: TPortfolioData,
  options: DiffPortfoliosOptions = {}
): PortfolioDiffEntry[] {
  const expandTheme = options.expandTheme !== false;
  const out: PortfolioDiffEntry[] = [];

  const fCfg = from.config;
  const tCfg = to.config;

  // Profile / HTML / Hero
  pushScalar(out, {
    id: "config.html.title",
    group: "profile",
    label: "Page title",
    path: "config.html.title",
    fromValue: fCfg.html.title,
    toValue: tCfg.html.title,
  });
  pushScalar(out, {
    id: "config.html.fullName",
    group: "profile",
    label: "Full name",
    path: "config.html.fullName",
    fromValue: fCfg.html.fullName,
    toValue: tCfg.html.fullName,
  });
  pushScalar(out, {
    id: "config.html.email",
    group: "profile",
    label: "Email",
    path: "config.html.email",
    fromValue: fCfg.html.email,
    toValue: tCfg.html.email,
  });
  pushScalar(out, {
    id: "config.hero.name",
    group: "profile",
    label: "Hero name",
    path: "config.hero.name",
    fromValue: fCfg.hero.name,
    toValue: tCfg.hero.name,
  });
  pushScalar(out, {
    id: "config.hero.p",
    group: "profile",
    label: "Hero taglines",
    path: "config.hero.p",
    fromValue: fCfg.hero.p,
    toValue: tCfg.hero.p,
  });

  // About
  pushScalar(out, {
    id: "config.sections.about.p",
    group: "about",
    label: "About eyebrow",
    path: "config.sections.about.p",
    fromValue: fCfg.sections.about.p,
    toValue: tCfg.sections.about.p,
  });
  pushScalar(out, {
    id: "config.sections.about.h2",
    group: "about",
    label: "About heading",
    path: "config.sections.about.h2",
    fromValue: fCfg.sections.about.h2,
    toValue: tCfg.sections.about.h2,
  });
  pushScalar(out, {
    id: "config.sections.about.content",
    group: "about",
    label: "About content",
    path: "config.sections.about.content",
    fromValue: fCfg.sections.about.content,
    toValue: tCfg.sections.about.content,
  });

  // Section headings for experience / feedbacks / works
  pushScalar(out, {
    id: "config.sections.experience.p",
    group: "experience",
    label: "Experience eyebrow",
    path: "config.sections.experience.p",
    fromValue: fCfg.sections.experience.p,
    toValue: tCfg.sections.experience.p,
  });
  pushScalar(out, {
    id: "config.sections.experience.h2",
    group: "experience",
    label: "Experience heading",
    path: "config.sections.experience.h2",
    fromValue: fCfg.sections.experience.h2,
    toValue: tCfg.sections.experience.h2,
  });
  pushScalar(out, {
    id: "config.sections.feedbacks.p",
    group: "testimonials",
    label: "Testimonials eyebrow",
    path: "config.sections.feedbacks.p",
    fromValue: fCfg.sections.feedbacks.p,
    toValue: tCfg.sections.feedbacks.p,
  });
  pushScalar(out, {
    id: "config.sections.feedbacks.h2",
    group: "testimonials",
    label: "Testimonials heading",
    path: "config.sections.feedbacks.h2",
    fromValue: fCfg.sections.feedbacks.h2,
    toValue: tCfg.sections.feedbacks.h2,
  });
  pushScalar(out, {
    id: "config.sections.works.p",
    group: "projects",
    label: "Projects eyebrow",
    path: "config.sections.works.p",
    fromValue: fCfg.sections.works.p,
    toValue: tCfg.sections.works.p,
  });
  pushScalar(out, {
    id: "config.sections.works.h2",
    group: "projects",
    label: "Projects heading",
    path: "config.sections.works.h2",
    fromValue: fCfg.sections.works.h2,
    toValue: tCfg.sections.works.h2,
  });
  pushScalar(out, {
    id: "config.sections.works.content",
    group: "projects",
    label: "Projects intro",
    path: "config.sections.works.content",
    fromValue: fCfg.sections.works.content,
    toValue: tCfg.sections.works.content,
  });

  // Contact
  pushScalar(out, {
    id: "config.contact.p",
    group: "contact",
    label: "Contact eyebrow",
    path: "config.contact.p",
    fromValue: fCfg.contact.p,
    toValue: tCfg.contact.p,
  });
  pushScalar(out, {
    id: "config.contact.h2",
    group: "contact",
    label: "Contact heading",
    path: "config.contact.h2",
    fromValue: fCfg.contact.h2,
    toValue: tCfg.contact.h2,
  });
  pushScalar(out, {
    id: "config.contact.form",
    group: "contact",
    label: "Contact form labels",
    path: "config.contact.form",
    fromValue: fCfg.contact.form,
    toValue: tCfg.contact.form,
  });

  // Meta
  for (const key of ["phone", "location", "linkedin", "github"] as const) {
    pushScalar(out, {
      id: `meta.${key}`,
      group: "meta",
      label: `Meta · ${key}`,
      path: `meta.${key}`,
      fromValue: from.meta[key] ?? "",
      toValue: to.meta[key] ?? "",
    });
  }

  // Nav links — treat as keyed list by id
  diffKeyedList(out, {
    group: "nav",
    listLabel: "nav link",
    arrayPath: "navLinks",
    fromList: from.navLinks,
    toList: to.navLinks,
    keyFn: navKey,
    itemLabel: (n) => n.title || n.id,
    fields: [
      { field: "id", label: "id", get: (n) => n.id },
      { field: "title", label: "title", get: (n) => n.title },
    ],
  });

  diffKeyedList(out, {
    group: "services",
    listLabel: "service",
    arrayPath: "services",
    fromList: from.services,
    toList: to.services,
    keyFn: serviceKey,
    itemLabel: (s) => s.title,
    fields: [
      { field: "title", label: "title", get: (s) => s.title },
      { field: "icon", label: "icon", kind: "icon", get: (s) => s.icon },
    ],
  });

  diffKeyedList(out, {
    group: "skills",
    listLabel: "skill",
    arrayPath: "technologies",
    fromList: from.technologies,
    toList: to.technologies,
    keyFn: techKey,
    itemLabel: (t) => t.name,
    fields: [
      { field: "name", label: "name", get: (t) => t.name },
      { field: "icon", label: "icon", kind: "icon", get: (t) => t.icon },
    ],
  });

  diffKeyedList(out, {
    group: "experience",
    listLabel: "role",
    arrayPath: "experiences",
    fromList: from.experiences,
    toList: to.experiences,
    keyFn: expKey,
    itemLabel: (e) => `${e.title} @ ${e.companyName}`,
    fields: [
      { field: "title", label: "title", get: (e) => e.title },
      { field: "companyName", label: "company", get: (e) => e.companyName },
      { field: "date", label: "date", get: (e) => e.date },
      { field: "location", label: "location", get: (e) => e.location ?? "" },
      { field: "subtitle", label: "subtitle", get: (e) => e.subtitle ?? "" },
      { field: "iconBg", label: "icon background", get: (e) => e.iconBg },
      { field: "icon", label: "icon", kind: "icon", get: (e) => e.icon },
      { field: "points", label: "bullet points", get: (e) => e.points },
    ],
  });

  diffKeyedList(out, {
    group: "projects",
    listLabel: "project",
    arrayPath: "projects",
    fromList: from.projects,
    toList: to.projects,
    keyFn: projectKey,
    itemLabel: (p) => p.name,
    fields: [
      { field: "name", label: "name", get: (p) => p.name },
      { field: "description", label: "description", get: (p) => p.description },
      { field: "sourceCodeLink", label: "source link", get: (p) => p.sourceCodeLink },
      { field: "tags", label: "tags", get: (p) => p.tags },
      { field: "image", label: "image", kind: "icon", get: (p) => p.image },
    ],
  });

  diffKeyedList(out, {
    group: "testimonials",
    listLabel: "testimonial",
    arrayPath: "testimonials",
    fromList: from.testimonials,
    toList: to.testimonials,
    keyFn: testimonialKey,
    itemLabel: (t) => `${t.name} (${t.company})`,
    fields: [
      { field: "name", label: "name", get: (t) => t.name },
      { field: "company", label: "company", get: (t) => t.company },
      { field: "designation", label: "designation", get: (t) => t.designation },
      { field: "testimonial", label: "quote", get: (t) => t.testimonial },
      { field: "image", label: "image", kind: "icon", get: (t) => t.image },
    ],
  });

  // Theme3d — always clamp before compare so defaults don't create noise
  const fromTheme = clampTheme3d(from.theme3d);
  const toTheme = clampTheme3d(to.theme3d);

  if (expandTheme) {
    for (const f of THEME_FIELDS) {
      pushScalar(out, {
        id: `theme3d.${f.key}`,
        group: "theme3d",
        label: f.label,
        path: `theme3d.${f.key}`,
        fromValue: fromTheme[f.key],
        toValue: toTheme[f.key],
        kind: f.kind ?? "theme",
      });
    }
  } else if (!valuesEqual(fromTheme, toTheme)) {
    out.push({
      id: "theme3d",
      group: "theme3d",
      label: "3D & theme settings",
      summary: "Theme / 3D pack settings differ",
      kind: "theme",
      path: "theme3d",
      fromValue: fromTheme,
      toValue: toTheme,
    });
  }

  return out;
}

/** Group labels for UI. */
export const DIFF_GROUP_LABELS: Record<DiffGroup, string> = {
  profile: "Profile & hero",
  about: "About",
  contact: "Contact",
  nav: "Navigation",
  meta: "Meta links",
  services: "Services",
  skills: "Skills & icons",
  experience: "Experience",
  projects: "Projects",
  testimonials: "Testimonials",
  theme3d: "3D & theme",
};

export function groupDiffEntries(
  entries: PortfolioDiffEntry[]
): Array<{ group: DiffGroup; label: string; entries: PortfolioDiffEntry[] }> {
  const order: DiffGroup[] = [
    "profile",
    "about",
    "contact",
    "meta",
    "nav",
    "services",
    "skills",
    "experience",
    "projects",
    "testimonials",
    "theme3d",
  ];
  return order
    .map((group) => ({
      group,
      label: DIFF_GROUP_LABELS[group],
      entries: entries.filter((e) => e.group === group),
    }))
    .filter((g) => g.entries.length > 0);
}

// ── Apply selected diffs ────────────────────────────────────────────────────

const ARRAY_ROOTS = new Set([
  "navLinks",
  "services",
  "technologies",
  "experiences",
  "projects",
  "testimonials",
]);

type ArrayRoot =
  | "navLinks"
  | "services"
  | "technologies"
  | "experiences"
  | "projects"
  | "testimonials";

function keyFnForArray(root: ArrayRoot): (item: unknown, index: number) => string {
  switch (root) {
    case "navLinks":
      return (item, i) => navKey(item as TNavLink, i);
    case "services":
      return (item, i) => serviceKey(item as TService, i);
    case "technologies":
      return (item, i) => techKey(item as TTechnology, i);
    case "experiences":
      return (item, i) => expKey(item as TExperience, i);
    case "projects":
      return (item, i) => projectKey(item as TProject, i);
    case "testimonials":
      return (item, i) => testimonialKey(item as TTestimonial, i);
  }
}

function setDeep(obj: Record<string, unknown>, path: string[], value: unknown): void {
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    const next = cur[key];
    if (next == null || typeof next !== "object") {
      cur[key] = {};
    }
    cur = cur[key] as Record<string, unknown>;
  }
  cur[path[path.length - 1]] = value;
}

/**
 * Parse paths like:
 *   config.hero.name
 *   theme3d.palette
 *   technologies[key=React].icon
 *   experiences[key=Acme|Engineer|2020]:add  (id-based, not path)
 *
 * Diff entry ids encode add/remove; path encodes set targets.
 */
function applyOneEntry(base: TPortfolioData, entry: PortfolioDiffEntry): void {
  const id = entry.id;

  // Array add / remove / whole-item replace via id prefixes
  const addMatch = id.match(
    /^(navLinks|services|technologies|experiences|projects|testimonials):add:(.+)$/
  );
  if (addMatch) {
    const root = addMatch[1] as ArrayRoot;
    const list = base[root] as unknown[];
    if (entry.toValue != null) {
      list.push(cloneJson(entry.toValue));
    }
    return;
  }

  const removeMatch = id.match(
    /^(navLinks|services|technologies|experiences|projects|testimonials):remove:(.+)$/
  );
  if (removeMatch) {
    const root = removeMatch[1] as ArrayRoot;
    const key = removeMatch[2];
    const list = base[root] as unknown[];
    const kf = keyFnForArray(root);
    const idx = list.findIndex((item, i) => {
      let k = kf(item, i);
      // Match disambiguated keys from indexByKey
      return k === key || `${k}#${i}` === key;
    });
    if (idx >= 0) list.splice(idx, 1);
    return;
  }

  const replaceMatch = id.match(
    /^(navLinks|services|technologies|experiences|projects|testimonials):replace:(.+)$/
  );
  if (replaceMatch) {
    const root = replaceMatch[1] as ArrayRoot;
    const key = replaceMatch[2];
    const list = base[root] as unknown[];
    const kf = keyFnForArray(root);
    const idx = list.findIndex((item, i) => {
      const k = kf(item, i);
      return k === key || `${k}#${i}` === key;
    });
    if (idx >= 0 && entry.toValue != null) {
      list[idx] = cloneJson(entry.toValue);
    }
    return;
  }

  // Array field: technologies[key=React].icon
  const arrayField = entry.path.match(
    /^(navLinks|services|technologies|experiences|projects|testimonials)\[key=([^\]]+)\](?:\.(.+))?$/
  );
  if (arrayField) {
    const root = arrayField[1] as ArrayRoot;
    const key = arrayField[2];
    const field = arrayField[3];
    const list = base[root] as Record<string, unknown>[];
    const kf = keyFnForArray(root);
    const idx = list.findIndex((item, i) => {
      const k = kf(item, i);
      return k === key || `${k}#${i}` === key;
    });
    if (idx < 0) {
      // Item missing on base — if we have a full toValue for whole item, skip field set
      return;
    }
    if (!field) {
      if (entry.toValue != null) list[idx] = cloneJson(entry.toValue) as Record<string, unknown>;
      return;
    }
    list[idx] = { ...list[idx], [field]: cloneJson(entry.toValue) };
    return;
  }

  // Whole theme object
  if (entry.path === "theme3d") {
    base.theme3d = clampTheme3d(entry.toValue as TTheme3d);
    return;
  }

  // Dot path into portfolio
  const parts = entry.path.split(".");
  if (parts[0] && ARRAY_ROOTS.has(parts[0])) {
    // Should have been handled above
    return;
  }
  setDeep(base as unknown as Record<string, unknown>, parts, cloneJson(entry.toValue));

  if (parts[0] === "theme3d") {
    base.theme3d = clampTheme3d(base.theme3d);
  }
}

function cloneJson<T>(value: T): T {
  if (value === undefined) return value;
  if (value === null || typeof value !== "object") return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Apply selected diff entries onto a base portfolio.
 * Returns a new cloned portfolio; does not mutate inputs.
 *
 * Selected entries take the `toValue` (compare side). Unselected differences
 * are left as in `base`.
 */
function clonePortfolioLocal(data: TPortfolioData): TPortfolioData {
  return JSON.parse(JSON.stringify(data)) as TPortfolioData;
}

export function applySelectedDiffs(
  base: TPortfolioData,
  entries: PortfolioDiffEntry[],
  selectedIds: Iterable<string>
): TPortfolioData {
  const selected = new Set(selectedIds);
  const next = clonePortfolioLocal(base);

  // Order: removes first, then field sets / replaces, then adds —
  // avoids index churn when multiple list ops are selected.
  const chosen = entries.filter((e) => selected.has(e.id));
  const removes = chosen.filter((e) => e.id.includes(":remove:"));
  const rest = chosen.filter((e) => !e.id.includes(":remove:"));
  const adds = rest.filter((e) => e.id.includes(":add:"));
  const middles = rest.filter((e) => !e.id.includes(":add:"));

  for (const e of removes) applyOneEntry(next, e);
  for (const e of middles) applyOneEntry(next, e);
  for (const e of adds) applyOneEntry(next, e);

  next.theme3d = clampTheme3d(next.theme3d);
  return next;
}

/**
 * Convenience: restore every change from `from` toward `to` (full patch).
 */
export function applyAllDiffs(
  base: TPortfolioData,
  from: TPortfolioData,
  to: TPortfolioData
): TPortfolioData {
  const entries = diffPortfolios(from, to);
  return applySelectedDiffs(base, entries, entries.map((e) => e.id));
}

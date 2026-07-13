import type { TPortfolioData } from "../../types/portfolio";

/**
 * Stable fingerprint for dirty / multi-tab comparisons.
 * Avoids hashing multi-MB base64 icons on every keystroke by sampling
 * structural fields + lengths of heavy strings.
 */
export function portfolioFingerprint(data: TPortfolioData): string {
  const tech = data.technologies.map((t) => [
    t.name,
    iconSig(t.icon),
  ]);
  const exp = data.experiences.map((e) => [
    e.title,
    e.companyName,
    e.date,
    e.location ?? "",
    e.subtitle ?? "",
    e.points.length,
    e.points.join("\0").length,
    iconSig(e.icon),
  ]);
  const projects = data.projects.map((p) => [
    p.name,
    p.description.length,
    p.sourceCodeLink,
    p.tags.map((t) => t.name).join(","),
    iconSig(p.image),
  ]);
  const testimonials = data.testimonials.map((t) => [
    t.name,
    t.company,
    t.designation,
    t.testimonial.length,
    iconSig(t.image),
  ]);
  const services = data.services.map((s) => [s.title, iconSig(s.icon)]);

  const payload = [
    data.config.html.title,
    data.config.html.fullName,
    data.config.html.email,
    data.config.hero.name,
    data.config.hero.p.join("\n"),
    data.config.sections.about.content,
    data.config.sections.works.content,
    JSON.stringify(data.meta),
    JSON.stringify(data.theme3d),
    JSON.stringify(tech),
    JSON.stringify(exp),
    JSON.stringify(projects),
    JSON.stringify(testimonials),
    JSON.stringify(services),
  ].join("|");

  return fnv1a(payload);
}

function iconSig(icon: string): string {
  if (!icon) return "0";
  if (icon.startsWith("data:")) {
    return `d:${icon.length}:${icon.slice(0, 48)}:${icon.slice(-24)}`;
  }
  if (icon.startsWith("http") || icon.startsWith("blob:")) {
    return `u:${icon.length}:${icon.slice(0, 96)}`;
  }
  // bundled asset path / import URL
  return `a:${icon.length}:${icon.slice(-64)}`;
}

/** Fast non-crypto hash — good enough for change detection. */
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

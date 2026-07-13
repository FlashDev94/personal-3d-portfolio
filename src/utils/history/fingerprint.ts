import type { TPortfolioData } from "../../types/portfolio";

/**
 * Stable fingerprint for dirty / multi-tab comparisons.
 * Avoids hashing multi-MB base64 icons on every keystroke by sampling
 * structural fields + content signatures for heavy strings.
 *
 * Must cover every field the configurator can edit, or undo/dirty/sync
 * will silently skip real changes.
 */
export function portfolioFingerprint(data: TPortfolioData): string {
  const cfg = data.config;
  const tech = data.technologies.map((t) => [t.name, iconSig(t.icon)]);
  const exp = data.experiences.map((e) => [
    e.title,
    e.companyName,
    e.date,
    e.location ?? "",
    e.subtitle ?? "",
    e.iconBg,
    textSig(e.points.join("\n")),
    iconSig(e.icon),
  ]);
  const projects = data.projects.map((p) => [
    p.name,
    textSig(p.description),
    p.sourceCodeLink,
    p.tags.map((t) => `${t.name}:${t.color}`).join(","),
    iconSig(p.image),
  ]);
  const testimonials = data.testimonials.map((t) => [
    t.name,
    t.company,
    t.designation,
    textSig(t.testimonial),
    iconSig(t.image),
  ]);
  const services = data.services.map((s) => [s.title, iconSig(s.icon)]);
  const nav = data.navLinks.map((n) => `${n.id}:${n.title}`);

  const payload = [
    cfg.html.title,
    cfg.html.fullName,
    cfg.html.email,
    cfg.hero.name,
    cfg.hero.p.join("\n"),
    cfg.contact.p,
    cfg.contact.h2,
    cfg.contact.form.name.span,
    cfg.contact.form.name.placeholder,
    cfg.contact.form.email.span,
    cfg.contact.form.email.placeholder,
    cfg.contact.form.message.span,
    cfg.contact.form.message.placeholder,
    cfg.sections.about.p,
    cfg.sections.about.h2,
    textSig(cfg.sections.about.content),
    cfg.sections.experience.p,
    cfg.sections.experience.h2,
    cfg.sections.feedbacks.p,
    cfg.sections.feedbacks.h2,
    cfg.sections.works.p,
    cfg.sections.works.h2,
    textSig(cfg.sections.works.content),
    JSON.stringify(data.meta),
    JSON.stringify(data.theme3d),
    JSON.stringify(nav),
    JSON.stringify(tech),
    JSON.stringify(exp),
    JSON.stringify(projects),
    JSON.stringify(testimonials),
    JSON.stringify(services),
  ].join("|");

  return fnv1a(payload);
}

/** Content signature: length + ends + sparse sample (not length-only). */
function textSig(text: string): string {
  if (!text) return "0";
  const n = text.length;
  if (n <= 96) return `t:${n}:${text}`;
  const mid = text.slice(Math.floor(n / 2) - 16, Math.floor(n / 2) + 16);
  return `t:${n}:${text.slice(0, 32)}:${mid}:${text.slice(-32)}`;
}

function iconSig(icon: string): string {
  if (!icon) return "0";
  if (icon.startsWith("data:")) {
    return `d:${icon.length}:${icon.slice(0, 48)}:${icon.slice(-24)}`;
  }
  if (icon.startsWith("http") || icon.startsWith("blob:")) {
    return `u:${icon.length}:${icon.slice(0, 96)}`;
  }
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

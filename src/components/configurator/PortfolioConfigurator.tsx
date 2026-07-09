import React, { useRef, useState } from "react";
import type {
  ConfiguratorTab,
  TPortfolioData,
} from "../../types/portfolio";
import { usePortfolio } from "../../context/PortfolioContext";
import {
  parseResumeFile,
  parseResumeFromUrl,
} from "../../utils/resumeParser";
import {
  fileToDataUrl,
  makeInitialsIcon,
  makeProjectPlaceholder,
  resolveCompanyIcon,
  resolveServiceIcon,
  resolveTechIcon,
  TECH_ICON_OPTIONS,
  TAG_COLORS,
} from "../../utils/icons";
import { defaultPortfolioData } from "../../constants/defaults";

const TABS: { id: ConfiguratorTab; label: string }[] = [
  { id: "upload", label: "Resume Upload" },
  { id: "profile", label: "Profile" },
  { id: "about", label: "About" },
  { id: "experience", label: "Experience" },
  { id: "skills", label: "Skills" },
  { id: "projects", label: "Projects" },
  { id: "testimonials", label: "Testimonials" },
  { id: "data", label: "Import / Export" },
];

const fieldClass =
  "w-full rounded-lg border border-white/10 bg-[#151030] px-3 py-2 text-sm text-white outline-none placeholder:text-secondary focus:border-[#915EFF]";
const labelClass = "mb-1 block text-xs font-medium uppercase tracking-wide text-secondary";
const sectionCard =
  "rounded-xl border border-white/10 bg-black-100/80 p-4 space-y-3";
const btnPrimary =
  "rounded-xl bg-[#915EFF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#7d4ee0] disabled:cursor-not-allowed disabled:opacity-50";
const btnGhost =
  "rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10";
const btnDanger =
  "rounded-xl border border-red-400/40 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/10";

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const PortfolioConfigurator: React.FC = () => {
  const { data, replaceData, resetToDefaults, exportJson, importJson } =
    usePortfolio();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ConfiguratorTab>("upload");
  const [draft, setDraft] = useState<TPortfolioData>(data);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openPanel = () => {
    setDraft(deepClone(data));
    setStatus(null);
    setError(null);
    setOpen(true);
  };

  const applyDraft = () => {
    replaceData(deepClone(draft));
    setStatus("Portfolio updated and saved to this browser.");
    setError(null);
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF resume.");
      return;
    }
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const parsed = await parseResumeFile(file);
      setDraft(parsed);
      setStatus(
        `Parsed “${file.name}” successfully. Review the tabs, tweak anything, then click Apply.`
      );
      setTab("profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse resume.");
    } finally {
      setLoading(false);
    }
  };

  const loadSample = async () => {
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const parsed = await parseResumeFromUrl("/sample-resume.pdf");
      setDraft(parsed);
      setStatus(
        "Sample resume loaded (Pradeep Singh). Review tabs and click Apply to update the portfolio."
      );
      setTab("profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sample resume.");
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = <K extends keyof TPortfolioData["config"]>(
    key: K,
    value: TPortfolioData["config"][K]
  ) => {
    setDraft((prev) => ({
      ...prev,
      config: { ...prev.config, [key]: value },
    }));
  };

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[#915EFF] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#915EFF]/40 transition hover:scale-105 hover:bg-[#7d4ee0]"
        aria-label="Customize portfolio"
      >
        <span className="text-base">⚙</span>
        Customize
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Close configurator backdrop"
            onClick={() => setOpen(false)}
          />

          <div className="relative flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-primary shadow-2xl sm:h-[85vh] sm:rounded-2xl">
            <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-white">Portfolio Configurator</h2>
                <p className="text-xs text-secondary">
                  Upload a resume or edit every section manually. Changes apply instantly after you click Apply.
                </p>
              </div>
              <button
                type="button"
                className={btnGhost}
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col md:flex-row">
              <nav className="flex gap-1 overflow-x-auto border-b border-white/10 p-3 md:w-48 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                      tab === t.id
                        ? "bg-[#915EFF] text-white"
                        : "text-secondary hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                {status && (
                  <div className="mb-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                    {status}
                  </div>
                )}
                {error && (
                  <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {error}
                  </div>
                )}

                {tab === "upload" && (
                  <div className="space-y-4">
                    <div className={sectionCard}>
                      <h3 className="text-base font-semibold text-white">
                        Upload resume (PDF)
                      </h3>
                      <p className="text-sm text-secondary">
                        We parse name, contact, summary, experience, projects, and skills
                        client-side in your browser. Nothing is uploaded to a server.
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                      />
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          className={btnPrimary}
                          disabled={loading}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {loading ? "Parsing…" : "Choose PDF"}
                        </button>
                        <button
                          type="button"
                          className={btnGhost}
                          disabled={loading}
                          onClick={loadSample}
                        >
                          Load sample resume
                        </button>
                      </div>
                      <p className="text-xs text-secondary">
                        Sample file: <code className="text-white/80">public/sample-resume.pdf</code>{" "}
                        (Pradeep Singh full-stack resume included in this repo).
                      </p>
                    </div>
                    <div className={sectionCard}>
                      <h3 className="text-base font-semibold text-white">How it works</h3>
                      <ol className="list-decimal space-y-1 pl-5 text-sm text-secondary">
                        <li>Upload your PDF or load the sample resume.</li>
                        <li>Review and edit Profile, Experience, Skills, and Projects tabs.</li>
                        <li>Click <strong className="text-white">Apply to portfolio</strong>.</li>
                        <li>Your configuration is saved in browser localStorage.</li>
                      </ol>
                    </div>
                  </div>
                )}

                {tab === "profile" && (
                  <div className="space-y-4">
                    <div className={sectionCard}>
                      <h3 className="font-semibold text-white">Identity</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className={labelClass}>Full name</label>
                          <input
                            className={fieldClass}
                            value={draft.config.html.fullName}
                            onChange={(e) => {
                              const fullName = e.target.value;
                              setDraft((prev) => ({
                                ...prev,
                                config: {
                                  ...prev.config,
                                  html: {
                                    ...prev.config.html,
                                    fullName,
                                    title: `${fullName} — 3D Portfolio`,
                                  },
                                  hero: {
                                    ...prev.config.hero,
                                    name: fullName.split(" ")[0] || fullName,
                                  },
                                },
                              }));
                            }}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Email</label>
                          <input
                            className={fieldClass}
                            value={draft.config.html.email}
                            onChange={(e) =>
                              updateConfig("html", {
                                ...draft.config.html,
                                email: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Page title</label>
                          <input
                            className={fieldClass}
                            value={draft.config.html.title}
                            onChange={(e) =>
                              updateConfig("html", {
                                ...draft.config.html,
                                title: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Hero first name</label>
                          <input
                            className={fieldClass}
                            value={draft.config.hero.name}
                            onChange={(e) =>
                              updateConfig("hero", {
                                ...draft.config.hero,
                                name: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className={sectionCard}>
                      <h3 className="font-semibold text-white">Hero taglines</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className={labelClass}>Line 1</label>
                          <input
                            className={fieldClass}
                            value={draft.config.hero.p[0] || ""}
                            onChange={(e) =>
                              updateConfig("hero", {
                                ...draft.config.hero,
                                p: [e.target.value, draft.config.hero.p[1] || ""],
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Line 2</label>
                          <input
                            className={fieldClass}
                            value={draft.config.hero.p[1] || ""}
                            onChange={(e) =>
                              updateConfig("hero", {
                                ...draft.config.hero,
                                p: [draft.config.hero.p[0] || "", e.target.value],
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className={sectionCard}>
                      <h3 className="font-semibold text-white">Contact meta (optional)</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {(
                          [
                            ["phone", "Phone"],
                            ["location", "Location"],
                            ["linkedin", "LinkedIn"],
                            ["github", "GitHub"],
                          ] as const
                        ).map(([key, label]) => (
                          <div key={key}>
                            <label className={labelClass}>{label}</label>
                            <input
                              className={fieldClass}
                              value={draft.meta[key] || ""}
                              onChange={(e) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  meta: { ...prev.meta, [key]: e.target.value },
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {tab === "about" && (
                  <div className="space-y-4">
                    <div className={sectionCard}>
                      <h3 className="font-semibold text-white">About section</h3>
                      <div>
                        <label className={labelClass}>Eyebrow</label>
                        <input
                          className={fieldClass}
                          value={draft.config.sections.about.p}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              config: {
                                ...prev.config,
                                sections: {
                                  ...prev.config.sections,
                                  about: {
                                    ...prev.config.sections.about,
                                    p: e.target.value,
                                  },
                                },
                              },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Heading</label>
                        <input
                          className={fieldClass}
                          value={draft.config.sections.about.h2}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              config: {
                                ...prev.config,
                                sections: {
                                  ...prev.config.sections,
                                  about: {
                                    ...prev.config.sections.about,
                                    h2: e.target.value,
                                  },
                                },
                              },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Overview content</label>
                        <textarea
                          className={`${fieldClass} min-h-[140px]`}
                          value={draft.config.sections.about.content}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              config: {
                                ...prev.config,
                                sections: {
                                  ...prev.config.sections,
                                  about: {
                                    ...prev.config.sections.about,
                                    content: e.target.value,
                                  },
                                },
                              },
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className={sectionCard}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-white">Service cards</h3>
                        <button
                          type="button"
                          className={btnGhost}
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              services: [
                                ...prev.services,
                                {
                                  title: "New Service",
                                  icon: resolveServiceIcon("Web Developer", prev.services.length),
                                },
                              ],
                            }))
                          }
                        >
                          + Add
                        </button>
                      </div>
                      {draft.services.map((service, index) => (
                        <div
                          key={index}
                          className="flex flex-wrap items-end gap-2 rounded-lg border border-white/5 p-3"
                        >
                          <div className="min-w-[200px] flex-1">
                            <label className={labelClass}>Title</label>
                            <input
                              className={fieldClass}
                              value={service.title}
                              onChange={(e) => {
                                const title = e.target.value;
                                setDraft((prev) => {
                                  const services = [...prev.services];
                                  services[index] = {
                                    title,
                                    icon: resolveServiceIcon(title, index),
                                  };
                                  return { ...prev, services };
                                });
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            className={btnDanger}
                            onClick={() =>
                              setDraft((prev) => ({
                                ...prev,
                                services: prev.services.filter((_, i) => i !== index),
                              }))
                            }
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tab === "experience" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">Work experience</h3>
                      <button
                        type="button"
                        className={btnGhost}
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            experiences: [
                              {
                                title: "Software Engineer",
                                companyName: "Company",
                                icon: resolveCompanyIcon("Company", prev.experiences.length),
                                iconBg: "#383E56",
                                date: "Jan 2024 – Present",
                                points: ["Describe your impact here."],
                              },
                              ...prev.experiences,
                            ],
                          }))
                        }
                      >
                        + Add role
                      </button>
                    </div>
                    {draft.experiences.map((exp, index) => (
                      <div key={index} className={sectionCard}>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className={labelClass}>Title</label>
                            <input
                              className={fieldClass}
                              value={exp.title}
                              onChange={(e) => {
                                const title = e.target.value;
                                setDraft((prev) => {
                                  const experiences = [...prev.experiences];
                                  experiences[index] = { ...experiences[index], title };
                                  return { ...prev, experiences };
                                });
                              }}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Company</label>
                            <input
                              className={fieldClass}
                              value={exp.companyName}
                              onChange={(e) => {
                                const companyName = e.target.value;
                                setDraft((prev) => {
                                  const experiences = [...prev.experiences];
                                  experiences[index] = {
                                    ...experiences[index],
                                    companyName,
                                    icon: resolveCompanyIcon(companyName, index),
                                  };
                                  return { ...prev, experiences };
                                });
                              }}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className={labelClass}>Date range</label>
                            <input
                              className={fieldClass}
                              value={exp.date}
                              onChange={(e) => {
                                const date = e.target.value;
                                setDraft((prev) => {
                                  const experiences = [...prev.experiences];
                                  experiences[index] = { ...experiences[index], date };
                                  return { ...prev, experiences };
                                });
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <label className={labelClass}>
                            Bullet points (one per line)
                          </label>
                          <textarea
                            className={`${fieldClass} min-h-[100px]`}
                            value={exp.points.join("\n")}
                            onChange={(e) => {
                              const points = e.target.value
                                .split("\n")
                                .map((p) => p.trim())
                                .filter(Boolean);
                              setDraft((prev) => {
                                const experiences = [...prev.experiences];
                                experiences[index] = {
                                  ...experiences[index],
                                  points: points.length ? points : [""],
                                };
                                return { ...prev, experiences };
                              });
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          className={btnDanger}
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              experiences: prev.experiences.filter((_, i) => i !== index),
                            }))
                          }
                        >
                          Remove role
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {tab === "skills" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">Technologies</h3>
                      <button
                        type="button"
                        className={btnGhost}
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            technologies: [
                              ...prev.technologies,
                              {
                                name: "New Skill",
                                icon: resolveTechIcon("New Skill"),
                              },
                            ],
                          }))
                        }
                      >
                        + Add skill
                      </button>
                    </div>
                    <p className="text-sm text-secondary">
                      Edit each skill name and choose its icon (built-in set, auto-resolve, initials, upload, or URL).
                      Bulk edit replaces names and re-resolves icons automatically.
                    </p>
                    <div className={sectionCard}>
                      <label className={labelClass}>Bulk edit names</label>
                      <textarea
                        className={`${fieldClass} min-h-[80px]`}
                        value={draft.technologies.map((t) => t.name).join(", ")}
                        onChange={(e) => {
                          const names = e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                          setDraft((prev) => ({
                            ...prev,
                            technologies: names.map((name) => ({
                              name,
                              icon: resolveTechIcon(name),
                            })),
                          }));
                        }}
                      />
                    </div>

                    {draft.technologies.map((tech, index) => (
                      <div key={`skill-${index}`} className={sectionCard}>
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#151030] p-2">
                            <img
                              src={tech.icon}
                              alt=""
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                          <div className="min-w-[180px] flex-1 space-y-3">
                            <div>
                              <label className={labelClass}>Skill name</label>
                              <input
                                className={fieldClass}
                                value={tech.name}
                                onChange={(e) => {
                                  const name = e.target.value;
                                  setDraft((prev) => {
                                    const technologies = [...prev.technologies];
                                    // Keep custom icon if user already overrode it with upload/url/picker
                                    const keepIcon =
                                      technologies[index].icon.startsWith("data:image/") &&
                                      !technologies[index].icon.includes("svg+xml");
                                    technologies[index] = {
                                      name,
                                      icon: keepIcon
                                        ? technologies[index].icon
                                        : resolveTechIcon(name || "Skill"),
                                    };
                                    return { ...prev, technologies };
                                  });
                                }}
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Icon</label>
                              <select
                                className={fieldClass}
                                value={
                                  TECH_ICON_OPTIONS.find((o) => o.icon === tech.icon)?.id ||
                                  (tech.icon.startsWith("data:") || tech.icon.startsWith("http")
                                    ? "custom"
                                    : "auto")
                                }
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setDraft((prev) => {
                                    const technologies = [...prev.technologies];
                                    if (value === "auto") {
                                      technologies[index] = {
                                        ...technologies[index],
                                        icon: resolveTechIcon(technologies[index].name),
                                      };
                                    } else if (value === "initials") {
                                      technologies[index] = {
                                        ...technologies[index],
                                        icon: makeInitialsIcon(
                                          technologies[index].name || "SK",
                                          "#151030"
                                        ),
                                      };
                                    } else if (value === "custom") {
                                      // keep current
                                    } else {
                                      const opt = TECH_ICON_OPTIONS.find((o) => o.id === value);
                                      if (opt) {
                                        technologies[index] = {
                                          ...technologies[index],
                                          icon: opt.icon,
                                        };
                                      }
                                    }
                                    return { ...prev, technologies };
                                  });
                                }}
                              >
                                <option value="auto">Auto-resolve from name</option>
                                <option value="initials">Initials badge</option>
                                {tech.icon.startsWith("data:") || tech.icon.startsWith("http") ? (
                                  <option value="custom">Custom (current)</option>
                                ) : null}
                                {TECH_ICON_OPTIONS.map((opt) => (
                                  <option key={opt.id} value={opt.id}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <label className={labelClass}>Upload icon image</label>
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                  className="block w-full text-xs text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-[#915EFF] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    if (file.size > 500_000) {
                                      setError("Icon image must be under 500KB.");
                                      return;
                                    }
                                    try {
                                      const dataUrl = await fileToDataUrl(file);
                                      setDraft((prev) => {
                                        const technologies = [...prev.technologies];
                                        technologies[index] = {
                                          ...technologies[index],
                                          icon: dataUrl,
                                        };
                                        return { ...prev, technologies };
                                      });
                                      setError(null);
                                    } catch {
                                      setError("Failed to read icon image.");
                                    }
                                  }}
                                />
                              </div>
                              <div>
                                <label className={labelClass}>Or icon URL / data URL</label>
                                <input
                                  className={fieldClass}
                                  placeholder="https://… or data:image/…"
                                  value={
                                    tech.icon.startsWith("http") ||
                                    (tech.icon.startsWith("data:image/") &&
                                      !tech.icon.includes("svg+xml;charset=utf-8"))
                                      ? tech.icon
                                      : ""
                                  }
                                  onChange={(e) => {
                                    const icon = e.target.value.trim();
                                    setDraft((prev) => {
                                      const technologies = [...prev.technologies];
                                      technologies[index] = {
                                        ...technologies[index],
                                        icon: icon || resolveTechIcon(technologies[index].name),
                                      };
                                      return { ...prev, technologies };
                                    });
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            className={btnDanger}
                            onClick={() =>
                              setDraft((prev) => ({
                                ...prev,
                                technologies: prev.technologies.filter((_, i) => i !== index),
                              }))
                            }
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {tab === "projects" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">Projects</h3>
                      <button
                        type="button"
                        className={btnGhost}
                        onClick={() =>
                          setDraft((prev) => {
                            const name = "New Project";
                            return {
                              ...prev,
                              projects: [
                                ...prev.projects,
                                {
                                  name,
                                  description: "Describe this project.",
                                  tags: [
                                    { name: "react", color: TAG_COLORS[0] },
                                  ],
                                  image: makeProjectPlaceholder(name, prev.projects.length),
                                  sourceCodeLink: "https://github.com/",
                                },
                              ],
                            };
                          })
                        }
                      >
                        + Add project
                      </button>
                    </div>
                    <div className={sectionCard}>
                      <label className={labelClass}>Projects intro</label>
                      <textarea
                        className={`${fieldClass} min-h-[80px]`}
                        value={draft.config.sections.works.content}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            config: {
                              ...prev.config,
                              sections: {
                                ...prev.config.sections,
                                works: {
                                  ...prev.config.sections.works,
                                  content: e.target.value,
                                },
                              },
                            },
                          }))
                        }
                      />
                    </div>
                    {draft.projects.map((project, index) => (
                      <div key={index} className={sectionCard}>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className={labelClass}>Name</label>
                            <input
                              className={fieldClass}
                              value={project.name}
                              onChange={(e) => {
                                const name = e.target.value;
                                setDraft((prev) => {
                                  const projects = [...prev.projects];
                                  projects[index] = {
                                    ...projects[index],
                                    name,
                                    image: projects[index].image.startsWith("data:")
                                      ? makeProjectPlaceholder(name, index)
                                      : projects[index].image,
                                  };
                                  return { ...prev, projects };
                                });
                              }}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Source / demo link</label>
                            <input
                              className={fieldClass}
                              value={project.sourceCodeLink}
                              onChange={(e) => {
                                const sourceCodeLink = e.target.value;
                                setDraft((prev) => {
                                  const projects = [...prev.projects];
                                  projects[index] = { ...projects[index], sourceCodeLink };
                                  return { ...prev, projects };
                                });
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <label className={labelClass}>Description</label>
                          <textarea
                            className={`${fieldClass} min-h-[80px]`}
                            value={project.description}
                            onChange={(e) => {
                              const description = e.target.value;
                              setDraft((prev) => {
                                const projects = [...prev.projects];
                                projects[index] = { ...projects[index], description };
                                return { ...prev, projects };
                              });
                            }}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Tags (comma-separated)</label>
                          <input
                            className={fieldClass}
                            value={project.tags.map((t) => t.name).join(", ")}
                            onChange={(e) => {
                              const tags = e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean)
                                .map((name, ti) => ({
                                  name,
                                  color: TAG_COLORS[ti % TAG_COLORS.length],
                                }));
                              setDraft((prev) => {
                                const projects = [...prev.projects];
                                projects[index] = {
                                  ...projects[index],
                                  tags: tags.length
                                    ? tags
                                    : [{ name: "web", color: TAG_COLORS[0] }],
                                };
                                return { ...prev, projects };
                              });
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          className={btnDanger}
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              projects: prev.projects.filter((_, i) => i !== index),
                            }))
                          }
                        >
                          Remove project
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {tab === "testimonials" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">Testimonials</h3>
                      <button
                        type="button"
                        className={btnGhost}
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            testimonials: [
                              ...prev.testimonials,
                              {
                                testimonial: "Great collaborator and engineer.",
                                name: "Colleague",
                                designation: "Manager",
                                company: "Company",
                                image: makeInitialsIcon("Colleague", "#915EFF"),
                              },
                            ],
                          }))
                        }
                      >
                        + Add testimonial
                      </button>
                    </div>
                    <p className="text-sm text-secondary">
                      Leave empty to hide the testimonials section on the site. Resume upload clears demo testimonials by default.
                    </p>
                    {draft.testimonials.map((item, index) => (
                      <div key={index} className={sectionCard}>
                        <div>
                          <label className={labelClass}>Quote</label>
                          <textarea
                            className={`${fieldClass} min-h-[80px]`}
                            value={item.testimonial}
                            onChange={(e) => {
                              const testimonial = e.target.value;
                              setDraft((prev) => {
                                const testimonials = [...prev.testimonials];
                                testimonials[index] = {
                                  ...testimonials[index],
                                  testimonial,
                                };
                                return { ...prev, testimonials };
                              });
                            }}
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {(
                            [
                              ["name", "Name"],
                              ["designation", "Role"],
                              ["company", "Company"],
                            ] as const
                          ).map(([key, label]) => (
                            <div key={key}>
                              <label className={labelClass}>{label}</label>
                              <input
                                className={fieldClass}
                                value={item[key]}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setDraft((prev) => {
                                    const testimonials = [...prev.testimonials];
                                    testimonials[index] = {
                                      ...testimonials[index],
                                      [key]: value,
                                      ...(key === "name"
                                        ? { image: makeInitialsIcon(value || "U") }
                                        : {}),
                                    };
                                    return { ...prev, testimonials };
                                  });
                                }}
                              />
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          className={btnDanger}
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              testimonials: prev.testimonials.filter((_, i) => i !== index),
                            }))
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {tab === "data" && (
                  <div className="space-y-4">
                    <div className={sectionCard}>
                      <h3 className="font-semibold text-white">Export / import JSON</h3>
                      <p className="text-sm text-secondary">
                        Download your full portfolio configuration or paste JSON from another device.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={btnPrimary}
                          onClick={() => {
                            const text = JSON.stringify(draft, null, 2);
                            setJsonText(text);
                            const blob = new Blob([text], { type: "application/json" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = "portfolio-config.json";
                            a.click();
                            URL.revokeObjectURL(url);
                            setStatus("JSON exported.");
                          }}
                        >
                          Download draft JSON
                        </button>
                        <button
                          type="button"
                          className={btnGhost}
                          onClick={() => setJsonText(exportJson())}
                        >
                          Load live config into editor
                        </button>
                      </div>
                      <textarea
                        className={`${fieldClass} min-h-[200px] font-mono text-xs`}
                        placeholder="Paste portfolio JSON here…"
                        value={jsonText}
                        onChange={(e) => setJsonText(e.target.value)}
                      />
                      <button
                        type="button"
                        className={btnPrimary}
                        onClick={() => {
                          try {
                            importJson(jsonText);
                            const parsed = JSON.parse(jsonText) as TPortfolioData;
                            setDraft(parsed);
                            setStatus("JSON imported and applied.");
                            setError(null);
                          } catch (err) {
                            setError(
                              err instanceof Error ? err.message : "Invalid JSON"
                            );
                          }
                        }}
                      >
                        Import JSON
                      </button>
                    </div>
                    <div className={sectionCard}>
                      <h3 className="font-semibold text-white">Reset</h3>
                      <p className="text-sm text-secondary">
                        Restore the original demo portfolio content and clear saved browser data.
                      </p>
                      <button
                        type="button"
                        className={btnDanger}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Reset portfolio to defaults? This clears your saved configuration."
                            )
                          ) {
                            resetToDefaults();
                            setDraft(deepClone(defaultPortfolioData));
                            setStatus("Portfolio reset to original demo content.");
                            setError(null);
                          }
                        }}
                      >
                        Reset to defaults
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
              <p className="text-xs text-secondary">
                Draft edits are local until you click Apply. Live site uses the applied config.
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btnGhost} onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={() => {
                    applyDraft();
                    setOpen(false);
                  }}
                >
                  Apply to portfolio
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
};

export default PortfolioConfigurator;

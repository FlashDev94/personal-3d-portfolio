import { useCallback, useState } from "react";
import type { TProject } from "../../types";

type Props = {
  projects: TProject[];
};

/**
 * Project carousel (Akash-style navigation) — keeps links + images accessible.
 */
const WorkCarousel = ({ projects }: Props) => {
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const n = projects.length;
  if (n === 0) return null;

  const go = useCallback(
    (next: number) => {
      if (busy) return;
      setBusy(true);
      setIndex(((next % n) + n) % n);
      window.setTimeout(() => setBusy(false), 400);
    },
    [busy, n]
  );

  const project = projects[index];
  const image =
    project.image ||
    "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect fill="#1a1530" width="100%" height="100%"/><text x="50%" y="50%" fill="#aaa6c3" text-anchor="middle" font-family="sans-serif" font-size="24">No image</text></svg>`
      );

  return (
    <div className="work-carousel relative mx-auto mt-12 w-full max-w-5xl">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-tertiary shadow-card">
        <div className="aspect-[16/10] w-full overflow-hidden bg-black-100">
          <img
            key={project.name + index}
            src={image}
            alt={project.name}
            className="h-full w-full object-cover transition-opacity duration-300"
            loading="lazy"
          />
        </div>
        <div className="flex flex-col gap-2 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-secondary text-xs font-semibold uppercase tracking-widest">
              {project.tags?.map((t) => t.name).join(" · ") || "Project"}
            </p>
            <h3 className="mt-1 text-2xl font-bold text-fg">{project.name}</h3>
            <p className="text-secondary mt-2 max-w-xl text-sm leading-relaxed">
              {project.description}
            </p>
          </div>
          {project.sourceCodeLink ? (
            <a
              href={project.sourceCodeLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ background: "var(--accent)" }}
              data-cursor="disable"
            >
              Open project
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          className="rounded-full border border-white/15 px-4 py-2 text-sm text-fg transition hover:bg-white/5"
          onClick={() => go(index - 1)}
          aria-label="Previous project"
          data-cursor="disable"
        >
          ← Prev
        </button>
        <div className="flex flex-wrap justify-center gap-2">
          {projects.map((p, i) => (
            <button
              key={p.name + i}
              type="button"
              aria-label={`Go to ${p.name}`}
              aria-current={i === index}
              className={`h-2.5 w-2.5 rounded-full transition ${
                i === index ? "scale-125" : "opacity-40"
              }`}
              style={{ background: "var(--accent)" }}
              onClick={() => go(i)}
              data-cursor="disable"
            />
          ))}
        </div>
        <button
          type="button"
          className="rounded-full border border-white/15 px-4 py-2 text-sm text-fg transition hover:bg-white/5"
          onClick={() => go(index + 1)}
          aria-label="Next project"
          data-cursor="disable"
        >
          Next →
        </button>
      </div>
      <p className="text-secondary mt-3 text-center text-xs">
        {index + 1} / {n}
      </p>
    </div>
  );
};

export default WorkCarousel;

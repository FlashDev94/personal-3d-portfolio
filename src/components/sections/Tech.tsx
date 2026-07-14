import { SectionWrapper } from "../../hoc";
import { usePortfolio } from "../../context/PortfolioContext";

/**
 * Skill icons as CSS “balls” instead of one WebGL <Canvas> per skill.
 * Multiple R3F canvases exhaust the browser WebGL context limit and crash the
 * Hero canvas (white screen) after first paint.
 *
 * Colors come from CSS variables so light/dark toggles do not re-render this
 * section (theme is applied on documentElement).
 */
const Tech = () => {
  const { data } = usePortfolio();
  const { technologies } = data;

  if (!technologies.length) return null;

  return (
    <div className="flex flex-row flex-wrap justify-center gap-10">
      {technologies.map((technology, index) => (
        <div
          key={`${technology.name}-${index}`}
          className="group flex h-28 w-28 flex-col items-center justify-center"
          title={technology.name}
        >
          <div
            className="tech-ball flex h-24 w-24 items-center justify-center rounded-full border bg-tertiary shadow-card transition duration-300 group-hover:-translate-y-1"
            style={{
              borderColor: "var(--color-border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "color-mix(in srgb, var(--accent) 50%, transparent)";
              e.currentTarget.style.boxShadow = "0 0 24px var(--accent-soft)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border)";
              e.currentTarget.style.boxShadow = "";
            }}
          >
            <img
              src={technology.icon}
              alt={technology.name}
              className="h-12 w-12 object-contain drop-shadow-md"
              loading="lazy"
              draggable={false}
            />
          </div>
          <span className="mt-2 max-w-[7rem] truncate text-center text-xs text-secondary group-hover:text-fg">
            {technology.name}
          </span>
        </div>
      ))}
    </div>
  );
};

export default SectionWrapper(Tech, "tech");

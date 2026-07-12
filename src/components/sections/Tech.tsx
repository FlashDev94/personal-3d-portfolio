import { SectionWrapper } from "../../hoc";
import { usePortfolio } from "../../context/PortfolioContext";
import { useThemeRuntime } from "../../utils/themeRuntime";

/**
 * Skill icons as CSS “balls” instead of one WebGL <Canvas> per skill.
 * Multiple R3F canvases exhaust the browser WebGL context limit and crash the
 * Hero canvas (white screen) after first paint.
 */
const Tech = () => {
  const { data } = usePortfolio();
  const { technologies } = data;
  const runtime = useThemeRuntime(data.theme3d);
  const accent = runtime.palette.accent;

  if (!technologies.length) return null;

  return (
    <div className="flex flex-row flex-wrap justify-center gap-10">
      {technologies.map((technology) => (
        <div
          key={technology.name}
          className="group flex h-28 w-28 flex-col items-center justify-center"
          title={technology.name}
        >
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-tertiary shadow-card transition duration-300 group-hover:-translate-y-1"
            style={{
              background: runtime.isLight
                ? "radial-gradient(circle at 30% 25%, #ffffff 0%, #eef2ff 55%, #e2e8f0 100%)"
                : "radial-gradient(circle at 30% 25%, #2a2540 0%, #151030 55%, #0b0918 100%)",
              borderColor: "var(--color-border)",
              ["--tech-accent" as string]: accent,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = `${accent}80`;
              e.currentTarget.style.boxShadow = `0 0 24px ${runtime.palette.accentSoft}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "";
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

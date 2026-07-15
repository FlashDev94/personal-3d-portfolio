import { usePortfolio } from "../../context/PortfolioContext";

const StoryTech = () => {
  const { data } = usePortfolio();
  const { technologies } = data;
  if (!technologies.length) return null;

  const row = [...technologies, ...technologies];

  return (
    <section id="tech" className="story-tech relative z-10 overflow-hidden py-20">
      <h2 className="mb-10 text-center text-3xl font-black text-fg sm:text-4xl">
        Tech <span style={{ color: "var(--accent)" }}>Stack</span>
      </h2>
      <div className="story-marquee relative">
        <div className="story-marquee-track flex w-max gap-10">
          {row.map((t, i) => (
            <div
              key={`${t.name}-${i}`}
              className="flex h-24 w-36 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-tertiary"
              title={t.name}
            >
              <img
                src={t.icon}
                alt={t.name}
                className="h-10 w-10 object-contain"
                loading="lazy"
                draggable={false}
              />
              <span className="max-w-[7rem] truncate text-xs text-secondary">
                {t.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StoryTech;

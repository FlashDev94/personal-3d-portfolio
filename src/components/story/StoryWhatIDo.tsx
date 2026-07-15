import { usePortfolio } from "../../context/PortfolioContext";
import { styles } from "../../constants/styles";

const StoryWhatIDo = () => {
  const { data } = usePortfolio();
  const { services } = data;

  if (!services.length) return null;

  return (
    <section
      id="services"
      className={`story-what relative z-10 mx-auto max-w-7xl py-24 ${styles.paddingX}`}
    >
      <h2 className="text-4xl font-black text-fg sm:text-6xl">
        What I <span style={{ color: "var(--accent)" }}>Do</span>
      </h2>
      <div className="story-what-grid mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s, i) => (
          <div
            key={s.title + i}
            className="story-what-card group relative overflow-hidden rounded-2xl border border-dashed border-white/20 bg-black-100/60 p-6 transition hover:border-[color:var(--accent)]"
            data-cursor="icons"
          >
            <div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl"
              style={{ background: "var(--accent-soft)" }}
            >
              <img
                src={s.icon}
                alt=""
                className="h-9 w-9 object-contain"
                loading="lazy"
              />
            </div>
            <h3 className="text-xl font-bold text-fg">{s.title}</h3>
            <div
              className="mt-4 h-px w-12 transition group-hover:w-24"
              style={{ background: "var(--accent)" }}
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export default StoryWhatIDo;

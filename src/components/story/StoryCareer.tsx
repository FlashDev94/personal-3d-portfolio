import { usePortfolio } from "../../context/PortfolioContext";
import { styles } from "../../constants/styles";
import { cleanCompanyDisplayName } from "../../utils/icons";

const StoryCareer = () => {
  const { data } = usePortfolio();
  const { config, experiences } = data;

  return (
    <section
      id="work"
      className={`story-career relative z-10 mx-auto max-w-7xl py-24 ${styles.paddingX}`}
    >
      <p className="text-secondary text-sm font-semibold uppercase tracking-[0.25em]">
        {config.sections.experience.p || "What I have done so far"}
      </p>
      <h2 className="mt-2 text-4xl font-black text-fg sm:text-5xl">
        {config.sections.experience.h2 || "Work Experience."}
      </h2>

      {experiences.length === 0 ? (
        <p className="text-secondary mt-10">
          No experience yet — open Customize to add roles.
        </p>
      ) : (
        <div className="relative mt-14 pl-8 sm:pl-12">
          <div
            className="story-career-line absolute bottom-0 left-3 top-0 w-0.5 origin-top sm:left-5"
            style={{ background: "var(--accent)" }}
          />
          <ul className="space-y-10">
            {experiences.map((exp, i) => {
              const company = cleanCompanyDisplayName(exp.companyName);
              return (
                <li key={i} className="story-career-item relative">
                  <span
                    className="absolute -left-[1.65rem] top-1.5 h-3 w-3 rounded-full border-2 border-[color:var(--color-primary)] sm:-left-[1.9rem]"
                    style={{ background: "var(--accent)" }}
                  />
                  <div className="rounded-2xl border border-white/10 bg-tertiary p-5 shadow-card">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold text-fg">{exp.title}</h3>
                        <p className="text-secondary text-sm font-semibold">
                          {company}
                          {exp.location ? ` · ${exp.location}` : ""}
                        </p>
                      </div>
                      <span className="text-secondary text-xs font-medium uppercase tracking-wide">
                        {exp.date}
                      </span>
                    </div>
                    {exp.points?.length > 0 && (
                      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-secondary">
                        {exp.points.slice(0, 4).map((p, j) => (
                          <li key={j}>{p}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
};

export default StoryCareer;

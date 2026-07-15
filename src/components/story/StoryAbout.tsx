import { usePortfolio } from "../../context/PortfolioContext";
import { styles } from "../../constants/styles";

const StoryAbout = () => {
  const { data } = usePortfolio();
  const { config } = data;

  return (
    <section
      id="about"
      className={`story-about relative z-10 mx-auto max-w-7xl py-24 ${styles.paddingX}`}
    >
      <div className="max-w-2xl rounded-3xl border border-white/10 bg-tertiary/80 p-8 shadow-card backdrop-blur-md">
        <p className="text-secondary text-sm font-semibold uppercase tracking-[0.25em]">
          {config.sections.about.p || "About"}
        </p>
        <h2 className="mt-2 text-4xl font-black text-fg sm:text-5xl">
          {config.sections.about.h2 || "Overview."}
        </h2>
        <p className="text-secondary mt-6 text-[17px] leading-[30px]">
          {config.sections.about.content}
        </p>
      </div>
    </section>
  );
};

export default StoryAbout;

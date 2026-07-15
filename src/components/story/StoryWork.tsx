import { usePortfolio } from "../../context/PortfolioContext";
import { styles } from "../../constants/styles";
import WorkCarousel from "../ui/WorkCarousel";

const StoryWork = () => {
  const { data } = usePortfolio();
  const { config, projects } = data;

  return (
    <section
      id="projects"
      className={`story-work relative z-10 mx-auto max-w-7xl py-24 ${styles.paddingX}`}
    >
      <p className="text-secondary text-sm font-semibold uppercase tracking-[0.25em]">
        {config.sections.works.p || "My work"}
      </p>
      <h2 className="mt-2 text-4xl font-black text-fg sm:text-5xl">
        {config.sections.works.h2 || "Projects."}
      </h2>
      <p className="text-secondary mt-4 max-w-2xl text-[16px] leading-relaxed">
        {config.sections.works.content}
      </p>
      {projects.length === 0 ? (
        <p className="text-secondary mt-10">No projects yet.</p>
      ) : (
        <WorkCarousel projects={projects} />
      )}
    </section>
  );
};

export default StoryWork;

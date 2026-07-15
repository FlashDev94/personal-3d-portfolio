import { useState } from "react";
import { motion } from "framer-motion";

import { SectionWrapper } from "../../hoc";
import { fadeIn } from "../../utils/motion";
import { Header } from "../atoms/Header";
import { usePortfolio } from "../../context/PortfolioContext";
import HoloProjectCard from "../ui/HoloProjectCard";
import WorkCarousel from "../ui/WorkCarousel";

const Works = () => {
  const { data } = usePortfolio();
  const { config, projects } = data;
  const [mode, setMode] = useState<"grid" | "carousel">("carousel");

  return (
    <>
      <Header useMotion={true} {...config.sections.works} />

      <div className="flex w-full flex-wrap items-end justify-between gap-4">
        <motion.p
          variants={fadeIn("", "", 0.1, 0.7)}
          className="text-secondary mt-3 max-w-3xl text-[17px] leading-[30px]"
        >
          {config.sections.works.content}
        </motion.p>
        {projects.length > 1 && (
          <div className="flex gap-2">
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                mode === "carousel" ? "text-white" : "text-secondary border border-white/10"
              }`}
              style={
                mode === "carousel" ? { background: "var(--accent)" } : undefined
              }
              onClick={() => setMode("carousel")}
              data-cursor="disable"
            >
              Carousel
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                mode === "grid" ? "text-white" : "text-secondary border border-white/10"
              }`}
              style={mode === "grid" ? { background: "var(--accent)" } : undefined}
              onClick={() => setMode("grid")}
              data-cursor="disable"
            >
              Holo grid
            </button>
          </div>
        )}
      </div>

      {projects.length === 0 ? (
        <p className="text-secondary mt-10 text-[16px]">
          No projects yet. Open Customize to add work samples.
        </p>
      ) : mode === "carousel" ? (
        <WorkCarousel projects={projects} />
      ) : (
        <div className="mt-16 flex flex-wrap gap-8">
          {projects.map((project, index) => (
            <HoloProjectCard
              key={`project-${project.name}-${index}`}
              index={index}
              {...project}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default SectionWrapper(Works, "projects");

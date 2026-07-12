import { motion } from "framer-motion";

import { SectionWrapper } from "../../hoc";
import { fadeIn } from "../../utils/motion";
import { Header } from "../atoms/Header";
import { usePortfolio } from "../../context/PortfolioContext";
import HoloProjectCard from "../ui/HoloProjectCard";

const Works = () => {
  const { data } = usePortfolio();
  const { config, projects } = data;

  return (
    <>
      <Header useMotion={true} {...config.sections.works} />

      <div className="flex w-full">
        <motion.p
          variants={fadeIn("", "", 0.1, 0.7)}
          className="text-secondary mt-3 max-w-3xl text-[17px] leading-[30px]"
        >
          {config.sections.works.content}
        </motion.p>
      </div>

      <div className="mt-16 flex flex-wrap gap-8">
        {projects.length === 0 ? (
          <p className="text-secondary text-[16px]">
            No projects yet. Open Customize to add work samples.
          </p>
        ) : (
          projects.map((project, index) => (
            <HoloProjectCard
              key={`project-${project.name}-${index}`}
              index={index}
              {...project}
            />
          ))
        )}
      </div>
    </>
  );
};

export default SectionWrapper(Works, "projects");

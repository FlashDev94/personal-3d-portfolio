import { BallCanvas } from "../canvas";
import { SectionWrapper } from "../../hoc";
import { usePortfolio } from "../../context/PortfolioContext";

const Tech = () => {
  const { data } = usePortfolio();
  const { technologies } = data;

  if (!technologies.length) return null;

  return (
    <>
      <div className="flex flex-row flex-wrap justify-center gap-10">
        {technologies.map((technology) => (
          <div className="h-28 w-28" key={technology.name}>
            <BallCanvas icon={technology.icon} />
          </div>
        ))}
      </div>
    </>
  );
};

export default SectionWrapper(Tech, "tech");

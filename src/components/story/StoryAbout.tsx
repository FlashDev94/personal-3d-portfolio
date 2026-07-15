import { usePortfolio } from "../../context/PortfolioContext";

const StoryAbout = () => {
  const { data } = usePortfolio();
  const { config } = data;

  return (
    <div className="about-section" id="about">
      <div className="about-me">
        <h3 className="title">{config.sections.about.h2 || "About Me"}</h3>
        <p className="para">{config.sections.about.content}</p>
      </div>
    </div>
  );
};

export default StoryAbout;

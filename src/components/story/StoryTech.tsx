import { usePortfolio } from "../../context/PortfolioContext";

/**
 * Tech section shell matches reference .techstack layout.
 * Uses CSS marquee instead of rapier physics balls (keeps deps light / robust).
 */
const StoryTech = () => {
  const { data } = usePortfolio();
  const { technologies } = data;
  if (!technologies.length) return null;

  const row = [...technologies, ...technologies];

  return (
    <div className="techstack" id="tech">
      <h2>My Techstack</h2>
      <div className="techstack-marquee" aria-hidden={false}>
        <div className="techstack-row">
          {row.map((t, i) => (
            <div className="techstack-chip" key={`${t.name}-a-${i}`} title={t.name}>
              <img src={t.icon} alt="" loading="lazy" draggable={false} />
              <span>{t.name}</span>
            </div>
          ))}
        </div>
        <div className="techstack-row reverse">
          {row.map((t, i) => (
            <div className="techstack-chip" key={`${t.name}-b-${i}`} title={t.name}>
              <img src={t.icon} alt="" loading="lazy" draggable={false} />
              <span>{t.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StoryTech;

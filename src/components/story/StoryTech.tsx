import { useMemo } from "react";
import { usePortfolio } from "../../context/PortfolioContext";

/**
 * Skills / techstack — each technology shown once in a responsive grid.
 * (Previous marquee duplicated the list 2× per row × 2 rows = 4× repetition.)
 */
const StoryTech = () => {
  const { data } = usePortfolio();

  const technologies = useMemo(() => {
    const seen = new Set<string>();
    return data.technologies.filter((t) => {
      const key = (t.name || "").trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data.technologies]);

  if (!technologies.length) return null;

  return (
    <section className="techstack" id="tech" aria-labelledby="techstack-heading">
      <h2 id="techstack-heading">My Techstack</h2>
      <ul className="techstack-grid">
        {technologies.map((t) => (
          <li className="techstack-chip" key={t.name} title={t.name}>
            <img src={t.icon} alt="" loading="lazy" draggable={false} />
            <span>{t.name}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default StoryTech;

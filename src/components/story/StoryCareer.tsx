import { usePortfolio } from "../../context/PortfolioContext";
import { cleanCompanyDisplayName } from "../../utils/icons";

const StoryCareer = () => {
  const { data } = usePortfolio();
  const { experiences } = data;

  return (
    <div className="career-section section-container" id="work">
      <div className="career-container">
        <h2>
          My career <span>&</span>
          <br /> experience
        </h2>
        {experiences.length === 0 ? (
          <p className="career-empty">
            No experience yet — open Customize to add roles.
          </p>
        ) : (
          <div className="career-info">
            <div className="career-timeline">
              <div className="career-dot" />
            </div>
            {experiences.map((exp, i) => {
              const company = cleanCompanyDisplayName(exp.companyName);
              const blurb =
                exp.points?.slice(0, 3).join(" ") ||
                exp.subtitle ||
                `${exp.title} at ${company}`;
              return (
                <div className="career-info-box" key={`${company}-${i}`}>
                  <div className="career-info-in">
                    <div className="career-role">
                      <h4>{exp.title}</h4>
                      <h5>
                        {company}
                        {exp.location ? ` · ${exp.location}` : ""}
                      </h5>
                    </div>
                    <h3>{shortDate(exp.date)}</h3>
                  </div>
                  <p>{blurb}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

/** Compress long date ranges for the big year column. */
function shortDate(date: string): string {
  if (!date) return "—";
  // "Dec 2025 – Jun 2026" → "25–26" or keep if already short
  if (date.length <= 12) return date.toUpperCase();
  const years = date.match(/20\d{2}/g);
  if (years && years.length >= 2) {
    return `${years[0].slice(2)}–${years[years.length - 1].slice(2)}`;
  }
  if (years && years.length === 1) {
    const lower = date.toLowerCase();
    if (lower.includes("present") || lower.includes("now") || lower.includes("current")) {
      return "NOW";
    }
    return years[0].slice(2);
  }
  return date;
}

export default StoryCareer;

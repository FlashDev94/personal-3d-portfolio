import { usePortfolio } from "../../context/PortfolioContext";
import HoverLinks from "../motion/HoverLinks";

/**
 * Fixed header matching akashrmalhotra Navbar DOM + CSS.
 * Uses portfolio navLinks / meta for content.
 */
const StoryNavbar = () => {
  const { data } = usePortfolio();
  const { config, meta, navLinks } = data;

  const initials = (config.html.fullName || config.hero.name || "P")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const connectLabel = meta.linkedin
    ? meta.linkedin.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")
    : config.html.email || "Connect";

  const links =
    navLinks.length > 0
      ? navLinks
      : [
          { id: "about", title: "About" },
          { id: "work", title: "Work" },
          { id: "contact", title: "Contact" },
        ];

  return (
    <>
      <div className="header">
        <a href="/#" className="navbar-title" data-cursor="disable">
          {initials}
        </a>
        {meta.linkedin ? (
          <a
            href={meta.linkedin}
            className="navbar-connect"
            data-cursor="disable"
            target="_blank"
            rel="noreferrer"
          >
            {connectLabel}
          </a>
        ) : config.html.email ? (
          <a
            href={`mailto:${config.html.email}`}
            className="navbar-connect"
            data-cursor="disable"
          >
            {connectLabel}
          </a>
        ) : (
          <span className="navbar-connect">{connectLabel}</span>
        )}
        <ul>
          {links.map((link) => (
            <li key={link.id}>
              <a data-href={`#${link.id}`} href={`#${link.id}`}>
                <HoverLinks text={link.title.toUpperCase()} />
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="landing-circle1" />
      <div className="landing-circle2" />
      <div className="nav-fade" />
    </>
  );
};

export default StoryNavbar;

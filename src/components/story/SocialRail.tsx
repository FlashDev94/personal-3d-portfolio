import { usePortfolio } from "../../context/PortfolioContext";

const SocialRail = () => {
  const { data } = usePortfolio();
  const meta = data.meta || {};
  const links: { label: string; href: string }[] = [];
  if (meta.github) links.push({ label: "GH", href: meta.github });
  if (meta.linkedin) links.push({ label: "IN", href: meta.linkedin });
  if (data.config.html.email)
    links.push({ label: "Mail", href: `mailto:${data.config.html.email}` });

  if (!links.length) return null;

  return (
    <aside
      className="pointer-events-none fixed bottom-8 left-4 z-30 hidden flex-col gap-3 lg:flex"
      aria-label="Social links"
    >
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target={l.href.startsWith("mailto:") ? undefined : "_blank"}
          rel="noreferrer"
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-tertiary/90 text-[10px] font-bold tracking-wide text-fg backdrop-blur transition hover:border-[color:var(--accent)]"
          data-cursor="icons"
        >
          {l.label}
        </a>
      ))}
    </aside>
  );
};

export default SocialRail;

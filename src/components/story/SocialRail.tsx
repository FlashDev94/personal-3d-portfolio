import { useEffect } from "react";
import { FaGithub, FaLinkedinIn } from "react-icons/fa6";
import { MdEmail } from "react-icons/md";
import { TbNotes } from "react-icons/tb";
import { usePortfolio } from "../../context/PortfolioContext";
import HoverLinks from "../motion/HoverLinks";

const SocialRail = () => {
  const { data } = usePortfolio();
  const meta = data.meta || {};
  const email = data.config.html.email;

  useEffect(() => {
    const social = document.getElementById("social");
    if (!social) return;
    const cleanups: Array<() => void> = [];

    social.querySelectorAll("span").forEach((item) => {
      const elem = item as HTMLElement;
      const link = elem.querySelector("a") as HTMLElement | null;
      if (!link) return;

      const rect = () => elem.getBoundingClientRect();
      let mouseX = rect().width / 2;
      let mouseY = rect().height / 2;
      let currentX = 0;
      let currentY = 0;
      let raf = 0;

      const updatePosition = () => {
        currentX += (mouseX - currentX) * 0.1;
        currentY += (mouseY - currentY) * 0.1;
        link.style.setProperty("--siLeft", `${currentX}px`);
        link.style.setProperty("--siTop", `${currentY}px`);
        raf = requestAnimationFrame(updatePosition);
      };

      const onMouseMove = (e: MouseEvent) => {
        const r = rect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        if (x < 40 && x > 10 && y < 40 && y > 5) {
          mouseX = x;
          mouseY = y;
        } else {
          mouseX = r.width / 2;
          mouseY = r.height / 2;
        }
      };

      document.addEventListener("mousemove", onMouseMove);
      updatePosition();
      cleanups.push(() => {
        document.removeEventListener("mousemove", onMouseMove);
        cancelAnimationFrame(raf);
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, [meta.github, meta.linkedin, email]);

  const hasAny = meta.github || meta.linkedin || email;
  if (!hasAny) return null;

  return (
    <div className="icons-section">
      <div className="social-icons" data-cursor="icons" id="social">
        {meta.github ? (
          <span>
            <a href={meta.github} target="_blank" rel="noreferrer" aria-label="GitHub">
              <FaGithub />
            </a>
          </span>
        ) : null}
        {meta.linkedin ? (
          <span>
            <a
              href={meta.linkedin}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
            >
              <FaLinkedinIn />
            </a>
          </span>
        ) : null}
        {email ? (
          <span>
            <a href={`mailto:${email}`} aria-label="Email">
              <MdEmail />
            </a>
          </span>
        ) : null}
      </div>
      {email ? (
        <a className="resume-button" href={`mailto:${email}`}>
          <HoverLinks text="CONTACT" />
          <span>
            <TbNotes />
          </span>
        </a>
      ) : null}
    </div>
  );
};

export default SocialRail;

import { useEffect, useRef } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePortfolio } from "../../context/PortfolioContext";

const StoryWhatIDo = () => {
  const { data } = usePortfolio();
  const services = data.services.slice(0, 4);
  const technologies = data.technologies;
  const containerRef = useRef<(HTMLDivElement | null)[]>([]);

  const setRef = (el: HTMLDivElement | null, index: number) => {
    containerRef.current[index] = el;
  };

  useEffect(() => {
    if (ScrollTrigger.isTouch) {
      containerRef.current.forEach((container) => {
        if (!container) return;
        container.classList.remove("what-noTouch");
        const handler = () => handleClick(container);
        container.addEventListener("click", handler);
        (container as HTMLDivElement & { __handler?: () => void }).__handler =
          handler;
      });
    }
    return () => {
      containerRef.current.forEach((container) => {
        if (!container) return;
        const h = (container as HTMLDivElement & { __handler?: () => void })
          .__handler;
        if (h) container.removeEventListener("click", h);
      });
    };
  }, [services.length]);

  if (!services.length) return null;

  // Show first two services in the dual-card layout (Akash design is 2 cards)
  const cards = services.slice(0, 2);
  // Distribute tech tags across cards
  const mid = Math.ceil(technologies.length / 2) || 1;

  return (
    <div className="whatIDO" id="services">
      <div className="what-box">
        <h2 className="title">
          W<span className="hat-h2">HAT</span>
          <div>
            I<span className="do-h2"> DO</span>
          </div>
        </h2>
      </div>
      <div className="what-box">
        <div className="what-box-in">
          <div className="what-border2">
            <svg width="100%">
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="100%"
                stroke="white"
                strokeWidth="2"
                strokeDasharray="7,7"
              />
              <line
                x1="100%"
                y1="0"
                x2="100%"
                y2="100%"
                stroke="white"
                strokeWidth="2"
                strokeDasharray="7,7"
              />
            </svg>
          </div>
          {cards.map((service, i) => {
            const tags =
              i === 0
                ? technologies.slice(0, mid).map((t) => t.name)
                : technologies.slice(mid).map((t) => t.name);
            const tagList =
              tags.length > 0
                ? tags.slice(0, 7)
                : [service.title, "Engineering", "Delivery"];
            return (
              <div
                key={service.title + i}
                className="what-content what-noTouch"
                ref={(el) => setRef(el, i)}
              >
                <div className="what-border1">
                  <svg height="100%">
                    <line
                      x1="0"
                      y1="0"
                      x2="100%"
                      y2="0"
                      stroke="white"
                      strokeWidth="2"
                      strokeDasharray="6,6"
                    />
                    <line
                      x1="0"
                      y1="100%"
                      x2="100%"
                      y2="100%"
                      stroke="white"
                      strokeWidth="2"
                      strokeDasharray="6,6"
                    />
                  </svg>
                </div>
                <div className="what-corner" />
                <div className="what-content-in">
                  <h3>{service.title.toUpperCase()}</h3>
                  <h4>
                    {i === 0
                      ? "Core craft & product delivery"
                      : "Systems that ship to production"}
                  </h4>
                  <p>
                    {i === 0
                      ? `Specializing in ${service.title.toLowerCase()} — from strategy and design to hands-on implementation.`
                      : `Building reliable systems and interfaces with a focus on ${service.title.toLowerCase()}.`}
                  </p>
                  <h5>Skillset & tools</h5>
                  <div className="what-content-flex">
                    {tagList.map((tag) => (
                      <div className="what-tags" key={tag}>
                        {tag}
                      </div>
                    ))}
                  </div>
                  <div className="what-arrow" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StoryWhatIDo;

function handleClick(container: HTMLDivElement) {
  container.classList.toggle("what-content-active");
  container.classList.remove("what-sibling");
  if (container.parentElement) {
    const siblings = Array.from(container.parentElement.children);
    siblings.forEach((sibling) => {
      if (sibling !== container && sibling.classList.contains("what-content")) {
        sibling.classList.remove("what-content-active");
        sibling.classList.toggle("what-sibling");
      }
    });
  }
}

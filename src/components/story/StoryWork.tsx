import { useCallback, useState } from "react";
import { MdArrowBack, MdArrowForward, MdArrowOutward } from "react-icons/md";
import { usePortfolio } from "../../context/PortfolioContext";

const StoryWork = () => {
  const { data } = usePortfolio();
  const { projects } = data;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const goToSlide = useCallback(
    (index: number) => {
      if (isAnimating || projects.length === 0) return;
      setIsAnimating(true);
      setCurrentIndex(index);
      window.setTimeout(() => setIsAnimating(false), 500);
    },
    [isAnimating, projects.length]
  );

  const goToPrev = useCallback(() => {
    if (!projects.length) return;
    const newIndex =
      currentIndex === 0 ? projects.length - 1 : currentIndex - 1;
    goToSlide(newIndex);
  }, [currentIndex, goToSlide, projects.length]);

  const goToNext = useCallback(() => {
    if (!projects.length) return;
    const newIndex =
      currentIndex === projects.length - 1 ? 0 : currentIndex + 1;
    goToSlide(newIndex);
  }, [currentIndex, goToSlide, projects.length]);

  return (
    <div className="work-section" id="projects">
      <div className="work-container section-container">
        <h2>
          My <span>Work</span>
        </h2>

        {projects.length === 0 ? (
          <p>No projects yet — open Customize to add work.</p>
        ) : (
          <div className="carousel-wrapper">
            <button
              type="button"
              className="carousel-arrow carousel-arrow-left"
              onClick={goToPrev}
              aria-label="Previous project"
              data-cursor="disable"
            >
              <MdArrowBack />
            </button>
            <button
              type="button"
              className="carousel-arrow carousel-arrow-right"
              onClick={goToNext}
              aria-label="Next project"
              data-cursor="disable"
            >
              <MdArrowForward />
            </button>

            <div className="carousel-track-container">
              <div
                className="carousel-track"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
              >
                {projects.map((project, index) => {
                  const tools =
                    project.tags?.map((t) => t.name).join(", ") ||
                    "Full-stack product";
                  const image =
                    project.image ||
                    "data:image/svg+xml," +
                      encodeURIComponent(
                        `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect fill="#0a0e17" width="100%" height="100%"/><text x="50%" y="50%" fill="#5eead4" text-anchor="middle" font-family="sans-serif" font-size="22">${project.name}</text></svg>`
                      );
                  return (
                    <div className="carousel-slide" key={project.name + index}>
                      <div className="carousel-content">
                        <div className="carousel-info">
                          <div className="carousel-number">
                            <h3>
                              {String(index + 1).padStart(2, "0")}
                            </h3>
                          </div>
                          <div className="carousel-details">
                            <h4>{project.name}</h4>
                            <p className="carousel-category">
                              {project.description?.slice(0, 120) ||
                                "Project"}
                              {project.description &&
                              project.description.length > 120
                                ? "…"
                                : ""}
                            </p>
                            <div className="carousel-tools">
                              <span className="tools-label">
                                Tools & Features
                              </span>
                              <p>{tools}</p>
                            </div>
                          </div>
                        </div>
                        <div className="carousel-image-wrapper">
                          <div className="work-image">
                            <a
                              className="work-image-in"
                              href={project.sourceCodeLink || undefined}
                              target="_blank"
                              rel="noreferrer"
                              data-cursor="disable"
                              onClick={(e) => {
                                if (!project.sourceCodeLink) e.preventDefault();
                              }}
                            >
                              {project.sourceCodeLink ? (
                                <div className="work-link">
                                  <MdArrowOutward />
                                </div>
                              ) : null}
                              <img src={image} alt={project.name} loading="lazy" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="carousel-dots">
              {projects.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  className={`carousel-dot ${
                    index === currentIndex ? "carousel-dot-active" : ""
                  }`}
                  onClick={() => goToSlide(index)}
                  aria-label={`Go to project ${index + 1}`}
                  data-cursor="disable"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryWork;
